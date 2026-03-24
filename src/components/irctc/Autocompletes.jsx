import { useEffect, useState } from "react";

import { STATIONS, TRAINS } from "./data";
import { fetchStations, fetchTrains } from "./api";
import { styles } from "./styles";

export function TrainAutocomplete({ from, to, value, onChange }) {
  const [inputValue, setInputValue] = useState(value || "");
  const [filtered, setFiltered] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [allTrains, setAllTrains] = useState([]);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const getTrainsForRouteFallback = () => {
    if (!from || !to) return [];
    const key = `${from}|${to}`;
    return TRAINS[key] || [];
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!from || !to) {
        setAllTrains([]);
        return;
      }

      try {
        const trains = await fetchTrains(from, to);
        if (!cancelled) setAllTrains(trains);
      } catch (e) {
        if (!cancelled) setAllTrains(getTrainsForRouteFallback());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const handleFocus = () => {
    setIsFocused(true);
    setFiltered(allTrains.length ? allTrains : getTrainsForRouteFallback());
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
    }, 200);
  };

  const handleInputChange = (val) => {
    setInputValue(val);

    const trains = allTrains.length ? allTrains : getTrainsForRouteFallback();
    const filteredList = trains.filter((train) =>
      train.name.toLowerCase().includes(val.toLowerCase())
    );

    setFiltered(filteredList);
  };

  const handleSelect = (trainObj) => {
    onChange(trainObj); // update parent
    setInputValue(trainObj.name); // update local input
    setFiltered([]);
    setIsFocused(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        style={styles.input}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search train number or name"
      />

      {isFocused && filtered.length > 0 && (
        <div style={styles.suggestionBox}>
          {filtered.map((train) => (
            <div
              key={train.name}
              style={styles.suggestionItem}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(train);
              }}
            >
              🚆 {train.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StationAutocomplete({ value, onChange, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [stations, setStations] = useState(STATIONS);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rows = await fetchStations();
        const list = rows.map((s) => s.display_name).filter(Boolean);
        if (!cancelled && list.length) setStations(list);
      } catch (e) {
        // Keep local fallback
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleInput = (val) => {
    onChange(val);

    if (!val.trim()) {
      setSuggestions([]);
      return;
    }

    const list = stations && stations.length ? stations : STATIONS;
    const filtered = list.filter((station) =>
      station.toLowerCase().includes(val.toLowerCase())
    );

    setSuggestions(filtered);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        style={styles.input}
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        placeholder={placeholder}
      />

      {suggestions.length > 0 && (
        <div style={styles.suggestionBox}>
          {suggestions.map((station, index) => (
            <div
              key={station}
              style={{
                ...styles.suggestionItem,
                background:
                  hovered === index
                    ? "linear-gradient(90deg, rgba(99,102,241,0.35), rgba(79,70,229,0.25))"
                    : "transparent",
                transform: hovered === index ? "translateX(4px)" : "translateX(0)",
              }}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                onChange(station);
                setSuggestions([]);
              }}
            >
              🚉 {station}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
