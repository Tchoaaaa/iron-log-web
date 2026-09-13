import Drawer from "./Drawer";
import ProfileFields from "./ProfileFields";
export default function DataEditModal({
  dataForm,
  dataFormError,
  dataBusy,
  onFieldChange,
  onCancel,
  onSave,
}) {
  return (
    <Drawer title="Mes informations" onClose={onCancel} busy={dataBusy}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <ProfileFields
          form={dataForm}
          onChange={onFieldChange}
          disabled={dataBusy}
        />
        {dataFormError && (
          <p role="alert" className="error">
            {dataFormError}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            className="secondary flex-1"
            onClick={onCancel}
            disabled={dataBusy}
          >
            Annuler
          </button>
          <button className="primary flex-1" disabled={dataBusy}>
            {dataBusy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
