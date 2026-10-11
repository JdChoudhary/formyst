import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { form } from "./models/form";
import { formVersion } from "./models/form-version";

async function main() {
  const slug = process.argv[2] ?? "scoring-test-web-fundamentals";
  const [row] = await db
    .select({ publishedVersionId: form.publishedVersionId })
    .from(form)
    .where(eq(form.slug, slug))
    .limit(1);

  if (!row?.publishedVersionId) {
    console.log("no published version");
    process.exit(0);
  }

  const [version] = await db
    .select({ schema: formVersion.schema })
    .from(formVersion)
    .where(eq(formVersion.id, row.publishedVersionId))
    .limit(1);

  const schema = version?.schema as any;
  console.log(JSON.stringify({ fields: schema?.fields, scoring: schema?.scoring, quiz: schema?.settings?.quiz }, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
