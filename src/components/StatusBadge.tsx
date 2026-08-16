const STATUS_LABELS: Record<string, string> = {
  WAIT: "המתנה",
  BUY_SETUP: "הזדמנות כניסה",
  BUY_CONFIRMED: "כניסה מאושרת",
  HOLD: "החזקה",
  EXIT: "יציאה",
  EXTENDED: "רחוקה מדי מהממוצע",
  NO_DATA: "אין נתונים",
};

const STATUS_CLASS: Record<string, string> = {
  WAIT: "status-wait",
  BUY_SETUP: "status-buy",
  BUY_CONFIRMED: "status-buy",
  HOLD: "status-buy",
  EXIT: "status-exit",
  EXTENDED: "status-nodata",
  NO_DATA: "status-nodata",
};

export default function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const cls = STATUS_CLASS[status] ?? "status-nodata";
  return <span className={`status-badge ${cls}`}>{label}</span>;
}
