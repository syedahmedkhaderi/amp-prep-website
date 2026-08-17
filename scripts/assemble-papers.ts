import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";
import { initDB, getDB } from "../lib/db/sqlite";

loadScriptsEnv();

/**
 * Assemble named mock papers from published questions.
 *
 * Both real tests are 60 multiple-choice questions in two hours, so a mock
 * paper is 60 single_mcq questions and nothing else. Practice mode still uses
 * all five question types, which are better for learning — typing a numeric
 * answer leaves nowhere to guess from — but a mock exam is meant to be a
 * rehearsal, and rehearsing the wrong format is not much of a rehearsal.
 *
 * Questions are reused across papers by design. 67 papers of 60 questions is
 * 4,020 slots against a bank of a few thousand; the goal is that a student
 * sitting several mocks rarely meets a repeat, not that the papers are
 * disjoint. Sampling is per topic so a paper spans the syllabus instead of
 * landing wherever a blind shuffle puts it.
 */

const AMP1_PAPER_SIZE = 60;
const AMP2_PAPER_SIZE = 60;
/** Below this, a paper's questions would repeat too often to be worth sitting. */
const MIN_POOL_MULTIPLE = 3;
const AMP1_FREE_PAPERS = Number(process.env.AMP1_FREE_PAPERS) || 10;
const AMP1_PRO_PAPERS = Number(process.env.AMP1_PRO_PAPERS) || 40;
const AMP2_PRO_PAPERS = Number(process.env.AMP2_PRO_PAPERS) || 20;

const uid = () => "p_" + Math.random().toString(36).slice(2, 10);

function assemble() {
  initDB();
  const db = getDB();

  // Clear existing papers
  db.prepare("DELETE FROM paper_questions").run();
  db.prepare("DELETE FROM papers").run();

  const insertPaper = db.prepare(
    "INSERT INTO papers (id, exam_code, name, is_free, order_index) VALUES (?, ?, ?, ?, ?)"
  );
  const insertPQ = db.prepare(
    "INSERT INTO paper_questions (id, paper_id, question_id, order_index) VALUES (?, ?, ?, ?)"
  );

  // Get all published questions by exam
  // Mock papers are multiple choice only, to match the real test.
  const pool = (examCode: string, freeOnly = false) =>
    db.prepare(
      `SELECT q.id, q.topic_id, q.difficulty FROM questions q
       JOIN exams e ON q.exam_id = e.id
       WHERE q.status = 'published' AND e.code = ? AND q.type = 'single_mcq'
       ${freeOnly ? "AND q.is_free = 1" : ""}
       ORDER BY q.topic_id, q.id`
    ).all(examCode) as any[];

  const amp1Free = pool("AMP1", true);
  const amp1All = pool("AMP1");
  const amp2All = pool("AMP2");

  console.log(`[assemble] AMP1 free: ${amp1Free.length}, AMP1 all: ${amp1All.length}, AMP2 all: ${amp2All.length}`);

  // Sample proportionally across topics so a paper spans the syllabus. A blind
  // shuffle over the whole pool leaves the topic mix to chance, and with some
  // topics holding far more questions than others that mix can be badly skewed.
  const buildPaper = (source: any[], size: number): any[] => {
    const byTopic = new Map<string, any[]>();
    for (const q of source) {
      const bucket = byTopic.get(q.topic_id);
      if (bucket) bucket.push(q);
      else byTopic.set(q.topic_id, [q]);
    }
    for (const bucket of byTopic.values()) bucket.sort(() => Math.random() - 0.5);

    const topics = [...byTopic.keys()];
    const picked: any[] = [];
    const cursor = new Map<string, number>();
    // Round-robin over topics until the paper is full, so every topic appears
    // before any topic appears twice.
    while (picked.length < size && topics.length > 0) {
      for (const topic of topics) {
        if (picked.length >= size) break;
        const bucket = byTopic.get(topic)!;
        const at = cursor.get(topic) ?? 0;
        if (at >= bucket.length) continue;
        picked.push(bucket[at]);
        cursor.set(topic, at + 1);
      }
      // Every topic exhausted: the pool is smaller than the paper.
      if (topics.every((t) => (cursor.get(t) ?? 0) >= byTopic.get(t)!.length)) break;
    }
    return picked.sort(() => Math.random() - 0.5);
  };

  const makePapers = (
    label: string,
    examCode: string,
    source: any[],
    count: number,
    size: number,
    isFree: number,
    startIndex: number
  ): number => {
    if (source.length < size) {
      console.warn(`[assemble] ${label}: pool of ${source.length} is smaller than a ${size}-question paper. Skipped.`);
      return 0;
    }
    if (source.length < size * MIN_POOL_MULTIPLE) {
      console.warn(
        `[assemble] ${label}: pool of ${source.length} is thin for ${size}-question papers. Questions will repeat often across papers.`
      );
    }
    let made = 0;
    for (let p = 0; p < count; p++) {
      const paperId = uid();
      insertPaper.run(paperId, examCode, `${label} ${p + 1}`, isFree, startIndex + p);
      buildPaper(source, size).forEach((q, i) => insertPQ.run("pq_" + uid(), paperId, q.id, i));
      made++;
    }
    return made;
  };

  let paperIdx = 0;
  const freeMade = makePapers("AMP 1 Practice Paper", "AMP1", amp1Free, AMP1_FREE_PAPERS, AMP1_PAPER_SIZE, 1, paperIdx);
  paperIdx += freeMade;
  console.log(`[assemble] Created ${freeMade} free AMP 1 papers.`);

  const proMade = makePapers("AMP 1 Pro Paper", "AMP1", amp1All, AMP1_PRO_PAPERS, AMP1_PAPER_SIZE, 0, paperIdx);
  console.log(`[assemble] Created ${proMade} pro AMP 1 papers.`);

  const amp2Made = makePapers("AMP 2 Pro Paper", "AMP2", amp2All, AMP2_PRO_PAPERS, AMP2_PAPER_SIZE, 0, 0);
  console.log(`[assemble] Created ${amp2Made} pro AMP 2 papers.`);

  // Summary
  const totalPapers = (db.prepare("SELECT COUNT(*) as c FROM papers").get() as any).c;
  console.log(`[assemble] Total papers: ${totalPapers}`);
}

assemble();
