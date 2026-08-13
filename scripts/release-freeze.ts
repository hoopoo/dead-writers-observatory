/**
 * Freeze Experiment B approved skeletons + validated snapshot prose.
 * Does not delete review DB. Gate-time artifact only. No live LLM.
 */
import fs from "node:fs";
import path from "node:path";
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { RELEASE_QA_FIXTURES } from "../src/data/fixtures/release-qa";
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import { buildExperimentBSkeletons } from "../src/lib/claims/experiment-b-skeletons";
import {
  hashFreezeCases,
  PUBLIC_BETA_FREEZE_PATH,
  PUBLIC_BETA_VERSION,
  validateFreezeArtifact,
} from "../src/lib/release/freeze";
import { getFragmentById } from "../src/data/fragments";
import { closeReviewDb } from "../src/lib/review/db";
import type { FrozenPublicBetaCase, PublicBetaFreezeArtifact } from "../src/types/release";
import type { EvidenceBoundedProseOutput, ProseSectionType } from "../src/types/prose";
import { loadLocalEnv } from "./load-env";

const SNAPSHOT_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "generation-snapshots",
  "prose-v1.json",
);

interface ProseSnapshotCase {
  fixtureId: string;
  personId: string;
  provider: string;
  model: string;
  promptVersion: string;
  validation: { allowed: boolean };
  sections: Array<{
    type: ProseSectionType;
    sentences: Array<{
      id: string;
      text: string;
      claimIds: string[];
      transformationType: EvidenceBoundedProseOutput["sections"][number]["sentences"][number]["transformationType"];
    }>;
  }>;
}

function proseFromSnapshot(
  row: ProseSnapshotCase,
): EvidenceBoundedProseOutput {
  return {
    personId: row.personId,
    sections: row.sections.map((section) => ({
      type: section.type,
      sentences: section.sentences.map((sentence) => ({
        id: sentence.id,
        text: sentence.text,
        claimIds: sentence.claimIds,
        transformationType: sentence.transformationType,
        introducesNewMeaning: false,
      })),
    })),
    sentenceMappings: row.sections.flatMap((section) =>
      section.sentences.map((sentence) => ({
        sentenceId: sentence.id,
        claimIds: sentence.claimIds,
        relation: "direct-restatement" as const,
        support: "supported" as const,
      })),
    ),
    editorMetadata: {
      provider: row.provider,
      model: row.model,
      promptVersion: row.promptVersion,
    },
  };
}

async function main() {
  loadLocalEnv();
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8")) as {
    cases: ProseSnapshotCase[];
  };
  const snapshotByKey = new Map(
    snapshot.cases.map((row) => [`${row.fixtureId}:${row.personId}`, row]),
  );

  const cases: FrozenPublicBetaCase[] = [];
  const questions = new Map<string, { fixtureId: string; question: string }>();
  for (const fixtureId of [
    ...PRIORITY_CLAIM_FIXTURES,
    ...FIXTURE_QUESTIONS.map((f) => f.id),
  ]) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId)!;
    questions.set(fixture.question.replace(/\s+/g, " ").trim(), {
      fixtureId,
      question: fixture.question,
    });
  }
  for (const qa of RELEASE_QA_FIXTURES) {
    const key = qa.question.replace(/\s+/g, " ").trim();
    if (!questions.has(key)) {
      questions.set(key, { fixtureId: qa.id, question: qa.question });
    }
  }

  for (const { fixtureId, question } of questions.values()) {
    const skeletons = await buildExperimentBSkeletons(question);
    for (const person of people) {
      const skeleton = skeletons.find((s) => s.personId === person.id)!;
      const snap = snapshotByKey.get(`${fixtureId}:${person.id}`);
      const proseAllowed = Boolean(
        snap?.validation.allowed &&
          snap.sections.some((s) => s.sentences.length > 0),
      );
      const prose = snap && proseAllowed ? proseFromSnapshot(snap) : undefined;

      const sourceIds = Array.from(
        new Set(
          skeleton.claims.flatMap((c) =>
            c.evidenceIds
              .map((id) => getFragmentById(id)?.sourceId)
              .filter((id): id is string => Boolean(id)),
          ),
        ),
      );

      cases.push({
        fixtureId,
        personId: person.id,
        question,
        skeleton,
        prose,
        proseAllowed,
        claimIds: skeleton.claimIds,
        evidenceIds: skeleton.evidenceIds,
        sourceIds,
      });
    }
  }

  const artifact: PublicBetaFreezeArtifact = {
    version: PUBLIC_BETA_VERSION,
    generatedAt: new Date().toISOString(),
    experimentId: "B",
    promptVersion: process.env.PROSE_PROMPT_VERSION ?? "v1",
    contentHash: hashFreezeCases(cases),
    cases,
  };

  const check = validateFreezeArtifact(artifact);
  if (!check.ok) {
    console.error("Freeze validation failed:\n" + check.issues.join("\n"));
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(PUBLIC_BETA_FREEZE_PATH), { recursive: true });
  fs.writeFileSync(
    PUBLIC_BETA_FREEZE_PATH,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `Wrote ${PUBLIC_BETA_FREEZE_PATH} (${cases.length} cases, hash=${artifact.contentHash.slice(0, 12)})`,
  );
  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  closeReviewDb();
  process.exit(1);
});
