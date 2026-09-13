import ProfileFields from "../components/ProfileFields";
export default function OnboardingScreen({ profileHook: p, confirmed }) {
  return (
    <main className="onboarding flex flex-col gap-6">
      <div>
        <span className="eyebrow">BIENVENUE CHEZ ØRE</span>
        <h1 className="page-title mt-3">Posons les bases.</h1>
        <p className="muted mt-3">
          Quelques repères pour compléter ton profil. Tu pourras les modifier à
          tout moment.
        </p>
      </div>
      {confirmed && (
        <p role="status" className="notice">
          Ton adresse e-mail est confirmée.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          p.saveData();
        }}
        className="flex flex-col gap-6"
      >
        <ProfileFields
          form={p.dataForm}
          onChange={p.setDataFormField}
          disabled={p.dataBusy}
        />
        <p className="muted text-xs">
          Les pas correspondent à ta moyenne habituelle, pas à un objectif à
          atteindre.
        </p>
        {p.dataFormError && (
          <p className="error" role="alert">
            {p.dataFormError}
          </p>
        )}
        <button className="primary" disabled={p.dataBusy}>
          {p.dataBusy ? "Enregistrement…" : "C’est parti"}
        </button>
      </form>
      <button className="text-button" onClick={p.signOut}>
        Se déconnecter
      </button>
      {p.profileError && (
        <p role="alert" className="error">
          {p.profileError}
        </p>
      )}
    </main>
  );
}
