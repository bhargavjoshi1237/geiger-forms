// Migration config for @geiger/orm. This product's tables live in the dedicated
// "forms" Postgres schema of the suite-shared Supabase project, and so does
// its migration ledger (forms.geiger_migrations).
export default {
  schema: "forms",
  url: process.env.STRING_URI,
};
