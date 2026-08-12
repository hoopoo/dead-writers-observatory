import { CuratorLoginForm } from "@/components/curator/CuratorLoginForm";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Curator Login",
};

export default async function CuratorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="curator-page">
      <section className="panel">
        <p className="eyebrow">CURATOR ACCESS</p>
        <h2>Internal token</h2>
        <p className="panel__lede">
          Curator Console は運用者向けです。token は URL に載せません。
        </p>
        <CuratorLoginForm
          nextPath={params.next ?? "/curator"}
          error={params.error}
        />
      </section>
    </div>
  );
}
