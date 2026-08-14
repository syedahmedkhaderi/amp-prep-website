/**
 * Single source of truth for the facts the legal pages assert.
 *
 * Terms, Privacy, Contact and the footer all state who operates the site, how
 * to reach them, and which law governs. Duplicating those strings across four
 * files is how they drift, and a privacy policy that contradicts the terms is
 * worse than either alone. Change them here.
 */

export const OPERATOR_NAME = "AMP Prep";

/**
 * The site is run by an individual, not a registered company. Saying so plainly
 * is both accurate and the thing that keeps the rest of the terms honest: an
 * individual cannot offer the guarantees a company can.
 */
export const OPERATOR_DESCRIPTION =
  "an independent project operated by a university student";

/**
 * Replace with a domain mailbox (support@yourdomain) once DNS is set up. It is
 * referenced everywhere through this constant so that is a one line change.
 */
export const CONTACT_EMAIL = "syedahmedkhaderi@gmail.com";

export const JURISDICTION = "the State of Qatar";

/**
 * Qatar's data protection statute. Named explicitly because a policy that
 * gestures at "applicable law" tells the reader nothing.
 */
export const DATA_PROTECTION_LAW =
  "Law No. 13 of 2016 concerning Personal Data Privacy Protection (PDPPL)";

/**
 * Shown on each policy. Update when the substance of a policy changes, not on
 * every deploy: a date that moves without the text changing trains readers to
 * ignore it.
 */
export const LAST_UPDATED = "14 August 2026";

/** The educational disclaimer, rendered on the policies and in the footer. */
export const EDUCATIONAL_DISCLAIMER =
  "This website is provided for educational and informational purposes. While we aim to provide accurate and up-to-date material, we do not guarantee the accuracy, completeness, or suitability of the content, nor do we guarantee any particular examination result.";

/** Non-affiliation statement. UDST is a third party with its own trademarks. */
export const NON_AFFILIATION =
  "AMP Prep is an independent study tool. It is not affiliated with, endorsed by, or connected to the University of Doha for Science and Technology. UDST is a trademark of its respective owner. The platform helps students prepare for the UDST AMP tests but does not claim any official status.";
