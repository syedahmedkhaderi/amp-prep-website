import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";
import { initDB, getDB } from "../lib/db/sqlite";

loadScriptsEnv();

/**
 * Assemble named papers from published questions.
 * AMP 1 papers have 60 questions across the 20 topics.
 * AMP 2 papers have 40 questions across the precalculus topics.
 * Free papers use only is_free questions.
 *
 * Spec Section 22: Paper assembly.
 */

const AMP1_PAPER_SIZE = 60;
const AMP2_PAPER_SIZE = 40;
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
  const amp1Free = db.prepare(
    `SELECT q.id, q.topic_id, q.difficulty FROM questions q
     JOIN exams e ON q.exam_id = e.id
     WHERE q.status = 'published' AND e.code = 'AMP1' AND q.is_free = 1`
  ).all() as any[];

  const amp1All = db.prepare(
    `SELECT q.id, q.topic_id, q.difficulty FROM questions q
     JOIN exams e ON q.exam_id = e.id
     WHERE q.status = 'published' AND e.code = 'AMP1'`
  ).all() as any[];

  const amp2All = db.prepare(
    `SELECT q.id, q.topic_id, q.difficulty FROM questions q
     JOIN exams e ON q.exam_id = e.id
     WHERE q.status = 'published' AND e.code = 'AMP2'`
  ).all() as any[];

  console.log(`[assemble] AMP1 free: ${amp1Free.length}, AMP1 all: ${amp1All.length}, AMP2 all: ${amp2All.length}`);

  // Assemble AMP 1 free papers
  let paperIdx = 0;
  const freePapersMade = Math.min(AMP1_FREE_PAPERS, Math.floor(amp1Free.length / AMP1_PAPER_SIZE));
  for (let p = 0; p < freePapersMade; p++) {
    const paperId = uid();
    insertPaper.run(paperId, "AMP1", `AMP 1 Practice Paper ${p + 1}`, 1, paperIdx++);
    const start = p * AMP1_PAPER_SIZE;
    const qs = amp1Free.slice(start, start + AMP1_PAPER_SIZE);
    qs.forEach((q, i) => {
      insertPQ.run("pq_" + uid(), paperId, q.id, i);
    });
  }
  console.log(`[assemble] Created ${freePapersMade} free AMP 1 papers.`);

  // Assemble AMP 1 pro papers (use all questions, shuffle differently)
  const proPapersMade = Math.min(AMP1_PRO_PAPERS, Math.floor(amp1All.length / AMP1_PAPER_SIZE));
  for (let p = 0; p < proPapersMade; p++) {
    const paperId = uid();
    insertPaper.run(paperId, "AMP1", `AMP 1 Pro Paper ${p + 1}`, 0, paperIdx++);
    const shuffled = [...amp1All].sort(() => Math.random() - 0.5).slice(0, AMP1_PAPER_SIZE);
    shuffled.forEach((q, i) => {
      insertPQ.run("pq_" + uid(), paperId, q.id, i);
    });
  }
  console.log(`[assemble] Created ${proPapersMade} pro AMP 1 papers.`);

  // Assemble AMP 2 pro papers
  paperIdx = 0;
  const amp2PapersMade = Math.min(AMP2_PRO_PAPERS, Math.floor(amp2All.length / AMP2_PAPER_SIZE));
  for (let p = 0; p < amp2PapersMade; p++) {
    const paperId = uid();
    insertPaper.run(paperId, "AMP2", `AMP 2 Pro Paper ${p + 1}`, 0, paperIdx++);
    const shuffled = [...amp2All].sort(() => Math.random() - 0.5).slice(0, AMP2_PAPER_SIZE);
    shuffled.forEach((q, i) => {
      insertPQ.run("pq_" + uid(), paperId, q.id, i);
    });
  }
  console.log(`[assemble] Created ${amp2PapersMade} pro AMP 2 papers.`);

  // Summary
  const totalPapers = (db.prepare("SELECT COUNT(*) as c FROM papers").get() as any).c;
  console.log(`[assemble] Total papers: ${totalPapers}`);
}

assemble();
