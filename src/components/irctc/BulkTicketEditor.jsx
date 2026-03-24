import { useEffect, useMemo, useState } from "react";
import { StationAutocomplete, TrainAutocomplete } from "./Autocompletes";
import { DISTANCES } from "./data";
import { generateBookingDateFromStart } from "./dates";
import { fetchDistanceKm } from "./api";
import { generatePDF } from "./pdf";
import { generateSeat } from "./seat";
import { styles } from "./styles";

function generateRandomPNR() {
  let pnr = "8";
  for (let i = 0; i < 9; i++) pnr += Math.floor(Math.random() * 9) + 1;
  return pnr;
}

function generateRandomTransactionID() {
  return (100006000000000 + Math.floor(Math.random() * 1000000000)).toString();
}

function extractStationCode(stationString) {
  if (!stationString) return "NA";

  if (typeof stationString === "object") {
    const code = stationString.code || stationString.stationCode || stationString.station_code;
    if (code) return String(code).trim().toUpperCase();
    return "NA";
  }

  const s = String(stationString).trim();
  if (!s) return "NA";

  const paren = s.match(/\(([^)]+)\)/);
  if (paren && paren[1]) return String(paren[1]).trim().toUpperCase();

  const dash = s.match(/-\s*([A-Za-z0-9]{2,6})\s*$/);
  if (dash && dash[1]) return String(dash[1]).trim().toUpperCase();

  const last = s.split(/\s+/).pop();
  if (last && /^[A-Za-z0-9]{2,6}$/.test(last)) return last.toUpperCase();

  return "NA";
}

function getFormattedStartDate(startDateString) {
  if (!startDateString) return "unknown";
  const match = startDateString.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!match) return "unknown";
  const day = parseInt(match[1], 10);
  const month = match[2].toLowerCase();
  const year = match[3];
  return `${day}${month}${year}`;
}

function makeRow() {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    date: "",
    dateISO: "",
    from: "",
    to: "",
    train: null,
  };
}

function isCompleteRow(row) {
  return Boolean(row.date && row.from && row.to && row.train);
}

function formatIsoToDdMmmYyyy(iso) {
  // iso: YYYY-MM-DD
  const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";

  const year = match[1];
  const month = parseInt(match[2], 10);
  const day = match[3];

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthStr = months[month - 1];
  if (!monthStr) return "";

  return `${day}-${monthStr}-${year}`;
}

export default function BulkTicketEditor({ templateBase64, fields }) {
  const [rows, setRows] = useState([makeRow()]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState("");

  const completedRows = useMemo(() => rows.filter(isCompleteRow), [rows]);

  useEffect(() => {
    const last = rows[rows.length - 1];
    if (last && isCompleteRow(last)) {
      setRows((prev) => [...prev, makeRow()]);
    }
  }, [rows]);

  const updateRow = (rowId, patch) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;

        const next = { ...r, ...patch };

        if (patch.from !== undefined || patch.to !== undefined) {
          next.train = null;
        }

        return next;
      })
    );
  };

  const openDatePicker = (rowId) => {
    const el = document.getElementById(`bulk-date-${rowId}`);
    if (!el) return;

    // Chrome/Edge: showPicker exists; fallback to click.
    if (typeof el.showPicker === "function") el.showPicker();
    else el.click();
  };

  const computeDistanceKmFallback = (from, to) => {
    if (!from || !to || from === to) return "";
    const key1 = `${from}|${to}`;
    const key2 = `${to}|${from}`;
    const distance = DISTANCES[key1] ?? DISTANCES[key2];
    return distance ? `${distance} KM` : "";
  };

  const buildFormDataFromRow = async (row, index) => {
    const datePart = row.date.trim();
    const startDate = `Start Date* ${datePart}`;

    const seat = generateSeat(row.train.seatType, row.train.name);

    let distanceText = "";
    try {
      const distanceKm = await fetchDistanceKm(row.from, row.to);
      distanceText = distanceKm ? `${distanceKm} KM` : "";
    } catch {
      distanceText = computeDistanceKmFallback(row.from, row.to);
    }

    return {
      name: "MAHESH PATEL",
      age: "30",
      gender: "M",
      bookingStatus: seat,
      currentStatus: seat,

      pnr: generateRandomPNR(),
      trainName: row.train.name,
      trainClass: row.train.class,

      distance: distanceText,
      bookingDate: generateBookingDateFromStart(startDate),

      bookedFrom: row.from,
      toStation: row.to,
      startDate,
      departure: `Departure* ${row.train.departure} ${datePart}`,
      arrival: `Arrival* ${row.train.arrival} ${datePart}`,

      transactionId: generateRandomTransactionID(),
      ticketFare: String(row.train.fare),
    };
  };

  const downloadPdfBytes = (bytes, fileName) => {
    const payload = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const blob = new Blob([payload], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 200);
  };

  const handleGenerateAll = async () => {
    if (completedRows.length < 1) {
      alert("Please fill at least 1 row (Date, From, To, Train).");
      return;
    }

    setIsGenerating(true);
    setProgressText("");

    try {
      for (let i = 0; i < completedRows.length; i++) {
        const row = completedRows[i];
        setProgressText(`Generating ${i + 1} / ${completedRows.length}...`);

        const formData = await buildFormDataFromRow(row, i);
        const pdfBytes = await generatePDF(formData, templateBase64, fields);

        const fromCode = extractStationCode(formData.bookedFrom);
        const toCode = extractStationCode(formData.toStation);
        const dateStr = getFormattedStartDate(formData.startDate);
        const fileName = `${fromCode}_${toCode}_${dateStr}_${i + 1}.pdf`;

        downloadPdfBytes(pdfBytes, fileName);

        // Tiny delay to reduce chances of browser blocking multiple downloads
        await new Promise((r) => setTimeout(r, 120));
      }

      setProgressText(`Done. Downloaded ${completedRows.length} ticket(s).`);
    } catch (e) {
      console.error(e);
      alert(`Error generating tickets: ${e?.message || String(e)}`);
      setProgressText("");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardIcon}>🧾</span>
        <div>
          <h2 style={styles.cardTitle}>Multiple Ticket Editor</h2>
          <p style={styles.cardSub}>Fill Date, From, To, Train — the rest auto-generates</p>
        </div>
      </div>

      <div style={{ ...styles.sectionLabel, marginTop: 0 }}>📋 Tickets</div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 2fr",
          gap: 12,
          marginBottom: 10,
          ...styles.label,
        }}
      >
        <div style={{ minWidth: 0 }}>Date</div>
        <div style={{ minWidth: 0 }}>From</div>
        <div style={{ minWidth: 0 }}>To</div>
        <div style={{ minWidth: 0 }}>Train</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((row, idx) => {
          const isComplete = isCompleteRow(row);
          const isLast = idx === rows.length - 1;

          return (
            <div
              key={row.id}
              style={{
                ...styles.computedBox,
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 2fr",
                gap: 12,
                alignItems: "start",
                padding: "10px 12px",
                opacity: !isLast && !isComplete ? 0.6 : 1,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ position: "relative" }}>
                  <input
                    style={{ ...styles.input, cursor: "pointer" }}
                    value={row.date}
                    readOnly
                    onClick={() => openDatePicker(row.id)}
                    placeholder="01-Feb-2026"
                  />

                  <input
                    id={`bulk-date-${row.id}`}
                    type="date"
                    value={row.dateISO}
                    onChange={(e) => {
                      const iso = e.target.value;
                      updateRow(row.id, {
                        dateISO: iso,
                        date: formatIsoToDdMmmYyyy(iso),
                      });
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0,
                      pointerEvents: "none",
                    }}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                <StationAutocomplete
                  value={row.from}
                  onChange={(val) => updateRow(row.id, { from: val })}
                  placeholder="From station"
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <StationAutocomplete
                  value={row.to}
                  onChange={(val) => updateRow(row.id, { to: val })}
                  placeholder="To station"
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <TrainAutocomplete
                  from={row.from}
                  to={row.to}
                  value={row.train?.name || ""}
                  onChange={(trainObj) => {
                    if (!trainObj || !trainObj.fare) return;
                    updateRow(row.id, { train: trainObj });
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <button
          style={{ ...styles.primaryBtn, width: "auto", padding: "12px 18px", opacity: isGenerating ? 0.7 : 1 }}
          onClick={handleGenerateAll}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <span style={styles.spinner} /> {progressText || "Generating..."}
            </>
          ) : (
            <>⬇ Generate & Download Tickets</>
          )}
        </button>

        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          {completedRows.length} ready
        </div>
      </div>

      {!!progressText && !isGenerating && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>{progressText}</div>
      )}
    </div>
  );
}
