/**
 * SeedExample.gs: a pattern for a project's starter content.
 *
 * To use for a new client:
 *   1. Copy this file to apps-script/SeedClientName.gs (the Seed*.gs name keeps it out of git).
 *   2. Rename the function and constant, and fill in the content.
 *   3. clasp push, reload the sheet, then Portal → Load starter content.
 *
 * Dates are written "YYYY-MM-DD". Words are fine where a date isn't known yet
 * (Plan → Target date, Settings → releaseDate).
 * Column names must match the headers in the sheet. Missing columns are left blank.
 */

function seedProject() {
  return seedExample();
}

function seedExample() {
  return loadSeed_(EXAMPLE_SEED);
}

const EXAMPLE_SEED = {
  settings: {
    projectName: 'Example App',
    ownerName: 'Edem',
    planLabel: 'Build Plan',
    studioName: 'ONAEL',
    studioUrl: 'https://onael.theengineroomai.com'
  },
  tabs: {
    Sets: [
      { 'Set': 'Set 1', 'Title': 'Getting started', 'Intro': 'A few quick questions so I can begin.', 'Opens': '2027-01-04', 'Due': '2027-01-08', 'Release': 'Auto', 'Notify client': 'Yes' }
    ],
    Questions: [
      { 'ID': 'Q-001', 'Set': 'Set 1', 'Order': 1, 'Question': 'Who is the app for?', 'Helpful note': 'One or two sentences is plenty.', 'Status': 'Not started' }
    ],
    Plan: [
      { 'ID': 'P-001', 'Phase': '1. Discovery', 'Target date': '2027-01-08', 'Step': 'Kickoff questions answered', 'Details': 'Set 1', 'Owner': 'Client', 'Status': 'Not started', 'Key date': 'No' }
    ],
    Files: [
      { 'ID': 'F-001', 'Item': 'Logo', 'Details': 'Highest quality you have', 'Status': 'Needed' }
    ],
    Approvals: [
      { 'ID': 'A-001', 'Posted': '2027-01-15', 'Title': 'First designs', 'What to look at': 'The main screens.', 'Decision': 'Coming soon' }
    ],
    Notes: []
  }
};
