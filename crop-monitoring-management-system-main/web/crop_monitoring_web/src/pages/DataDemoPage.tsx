import { useState, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";

// ─── Typography Override ───────────────────────────────────────────────────────
const FONTS = ``;

// ─── Mock data ─────────────────────────────────────────────────────────────────
type StaffRole = "admin" | "supervisor" | "collector";
type StressState = "None" | "Drought" | "Pest";

interface MockStaff {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: StaffRole;
}

interface MockObservation {
  id: number;
  field_name: string;
  section_name: string;
  crop_information?: {
    crop_type: string;
    variety?: string;
  };
  crop_monitoring?: {
    stress?: StressState;
  };
  date_recorded: string;
  images?: number[];
}

interface PulseDotProps {
  color: string;
  size?: number;
}

interface GlowBadgeProps {
  color: string;
  bg: string;
  children: ReactNode;
}

interface HexAvatarProps {
  name?: string;
  email?: string;
  size?: number;
}

interface DataCardProps {
  children: ReactNode;
  accentColor: string;
  headerContent: ReactNode;
}

interface CardHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  count?: number;
  accentColor: string;
}

interface ColBarProps {
  cols: string[];
  template: string;
}

interface RowProps {
  children: ReactNode;
  delay?: number;
}

interface StaffTableProps {
  isAdmin: boolean;
}

interface RoleBannerProps {
  isAdmin: boolean;
  role: string;
}

const MOCK_STAFF: MockStaff[] = [
  { id: 1, first_name: "Amara",   last_name: "Okonkwo",  email: "amara@fieldops.io",    role: "admin"      },
  { id: 2, first_name: "Luca",    last_name: "Ferreira",  email: "luca@fieldops.io",     role: "supervisor" },
  { id: 3, first_name: "Priya",   last_name: "Sharma",    email: "priya@fieldops.io",    role: "collector"  },
  { id: 4, first_name: "Tobias",  last_name: "Müller",    email: "tobias@fieldops.io",   role: "collector"  },
  { id: 5, first_name: "Yuki",    last_name: "Tanaka",    email: "yuki@fieldops.io",     role: "supervisor" },
];

const MOCK_OBS: MockObservation[] = [
  { id: 1, field_name: "North Ridge",    section_name: "Block A-12", crop_information: { crop_type: "Maize",    variety: "SC403"   }, crop_monitoring: { stress: "None"    }, date_recorded: "2026-02-20", images: [1, 2, 3] },
  { id: 2, field_name: "Valley Floor",   section_name: "Plot B-7",   crop_information: { crop_type: "Soybean",  variety: "DT97-15" }, crop_monitoring: { stress: "Drought" }, date_recorded: "2026-02-19", images: [1]       },
  { id: 3, field_name: "Eastern Slopes", section_name: "Sec C-3",    crop_information: { crop_type: "Wheat",    variety: "Durum"   }, crop_monitoring: { stress: "None"    }, date_recorded: "2026-02-18", images: []        },
  { id: 4, field_name: "Hilltop Farm",   section_name: "Zone D",     crop_information: { crop_type: "Cotton",   variety: "BT-151"  }, crop_monitoring: { stress: "Pest"    }, date_recorded: "2026-02-17", images: [1, 2]    },
  { id: 5, field_name: "South Wetlands", section_name: "Lot E-2",    crop_information: { crop_type: "Rice",     variety: "Jasmine" }, crop_monitoring: { stress: "None"    }, date_recorded: "2026-02-15", images: [1]       },
];

// ─── Color system ──────────────────────────────────────────────────────────────
const C = {
  bg:         "#000000",
  surface:    "#000000",
  surfaceAlt: "#000000",
  border:     "rgba(255,255,255,0.06)",
  borderHi:   "rgba(255,255,255,0.12)",

  cyan:    "#43a047",
  cyanDim: "rgba(27,94,32,0.15)",
  cyanGlow:"rgba(27,94,32,0.4)",

  gold:    "#1b5e20",
  goldDim: "rgba(27,94,32,0.15)",

  violet:  "#43a047",
  violetDim:"rgba(27,94,32,0.15)",

  emerald: "#1b5e20",
  emeraldDim:"rgba(27,94,32,0.12)",

  rose:    "#43a047",
  roseDim: "rgba(27,94,32,0.12)",

  amber:   "#1b5e20",
  amberDim:"rgba(27,94,32,0.12)",

  t90: "rgba(255,255,255,0.9)",
  t60: "rgba(255,255,255,0.6)",
  t35: "rgba(255,255,255,0.35)",
  t15: "rgba(255,255,255,0.15)",
};

// ─── Utility: role config ──────────────────────────────────────────────────────
const roleConfig: Record<StaffRole, { color: string; glow: string; icon: string; label: string }> = {
  admin:      { color: C.violet, glow: "rgba(167,139,250,0.3)", icon: "◆", label: "ADMIN"      },
  supervisor: { color: C.gold,   glow: "rgba(245,158,11,0.3)",  icon: "▲", label: "SUPERVISOR" },
  collector:  { color: C.cyan,   glow: "rgba(34,211,238,0.3)",  icon: "●", label: "COLLECTOR"  },
};

const stressConfig: Record<StressState, { color: string; bg: string; icon: string; label: string }> = {
  None:    { color: C.emerald, bg: C.emeraldDim, icon: "✦", label: "NOMINAL"  },
  Drought: { color: C.amber,   bg: C.amberDim,   icon: "▲", label: "DROUGHT"  },
  Pest:    { color: C.rose,    bg: C.roseDim,    icon: "⚠", label: "PEST"     },
};

// ─── Reusable atoms ────────────────────────────────────────────────────────────

function ScanLine() {
  return (
    <motion.div
      initial={{ top: "0%", opacity: 0 }}
      animate={{ top: ["0%", "100%", "100%"], opacity: [0, 0.6, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear", times: [0, 0.85, 1] }}
      style={{
        position: "absolute", left: 0, right: 0, height: 1, pointerEvents: "none", zIndex: 5,
        background: `linear-gradient(90deg, transparent, ${C.cyan}, transparent)`,
        boxShadow: `0 0 12px ${C.cyanGlow}`,
      }}
    />
  );
}

function GridLines() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
      backgroundImage: `
        linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)
      `,
      backgroundSize: "40px 40px",
    }} />
  );
}

function PulseDot({ color, size = 8 }: PulseDotProps) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <motion.div
        animate={{ scale: [1, 2.2, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
        style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          backgroundColor: color, opacity: 0.4,
        }}
      />
      <div style={{
        position: "absolute", inset: "20%", borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 ${size * 1.5}px ${color}`,
      }} />
    </div>
  );
}

function GlowBadge({ color, bg, children }: GlowBadgeProps) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 6,
      background: bg,
      border: `1px solid ${color}40`,
      fontFamily: "Times New Roman, Times, serif",
      fontSize: 11, fontWeight: 500, color,
      letterSpacing: "0.1em",
      boxShadow: `inset 0 1px 0 ${color}20`,
    }}>
      {children}
    </div>
  );
}

function HexAvatar({ name, email, size = 40 }: HexAvatarProps) {
  const initials = name
    ? name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()
    : (email?.[0] || "U").toUpperCase();
  const palette = [C.cyan, C.gold, C.violet, C.emerald, C.emerald];
  const idx = ((email?.charCodeAt(0) || 0) + (email?.charCodeAt(1) || 0)) % palette.length;
  const color = palette[idx];

  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      style={{
        width: size, height: size, borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(135deg, ${color}20, ${color}08)`,
        border: `1.5px solid ${color}35`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Times New Roman, Times, serif", fontWeight: 500,
        fontSize: size * 0.32, color,
        boxShadow: `0 0 20px ${color}15, inset 0 1px 0 ${color}20`,
        cursor: "default",
      }}
    >
      {initials}
    </motion.div>
  );
}

// ─── Section card wrapper ──────────────────────────────────────────────────────
function DataCard({ children, accentColor, headerContent }: DataCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        borderRadius: 20,
        background: C.surface,
        border: `1px solid ${hovered ? accentColor + "30" : C.border}`,
        overflow: "hidden",
        position: "relative",
        boxShadow: hovered
          ? `0 0 60px ${accentColor}10, 0 24px 80px rgba(0,0,0,0.5)`
          : "0 8px 40px rgba(0,0,0,0.4)",
        transition: "box-shadow 0.4s ease, border-color 0.4s ease",
        marginBottom: 32,
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent 0%, ${accentColor} 40%, ${accentColor}80 70%, transparent 100%)`,
      }} />

      {/* Corner decorations */}
      <div style={{ position: "absolute", top: 12, right: 12, width: 40, height: 40, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 12, height: 1, background: accentColor + "50" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 1, height: 12, background: accentColor + "50" }} />
      </div>
      <div style={{ position: "absolute", bottom: 12, left: 12, width: 40, height: 40, pointerEvents: "none" }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 12, height: 1, background: accentColor + "50" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 1, height: 12, background: accentColor + "50" }} />
      </div>

      <ScanLine />
      <div style={{ position: "relative", zIndex: 1 }}>
        {headerContent}
        {children}
      </div>
    </motion.div>
  );
}

// ─── Card header ──────────────────────────────────────────────────────────────
function CardHeader({ icon, title, subtitle, count, accentColor }: CardHeaderProps) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "22px 28px 20px",
      borderBottom: `1px solid ${C.border}`,
      background: `linear-gradient(180deg, ${accentColor}08 0%, transparent 100%)`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)`,
          border: `1px solid ${accentColor}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accentColor, fontSize: 20,
          boxShadow: `0 0 24px ${accentColor}20`,
        }}>
          {icon}
        </div>
        <div>
          <div style={{
            fontFamily: "Times New Roman, Times, serif",
            fontWeight: 800, fontSize: 18, color: C.t90, letterSpacing: "-0.02em",
          }}>{title}</div>
          <div style={{
            fontFamily: "Times New Roman, Times, serif",
            fontSize: 11, color: C.t35, marginTop: 2, letterSpacing: "0.05em",
          }}>{subtitle}</div>
        </div>
      </div>
      {count !== undefined && (
        <div style={{
          padding: "6px 14px", borderRadius: 8,
          background: `${accentColor}12`,
          border: `1px solid ${accentColor}25`,
          fontFamily: "Times New Roman, Times, serif",
          fontSize: 12, fontWeight: 500, color: accentColor,
          letterSpacing: "0.05em",
        }}>
          {String(count).padStart(2, "0")} records
        </div>
      )}
    </div>
  );
}

// ─── Column header bar ────────────────────────────────────────────────────────
function ColBar({ cols, template }: ColBarProps) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: template,
      padding: "12px 28px",
      background: "rgba(0,0,0,0.25)",
      borderBottom: `1px solid ${C.border}`,
    }}>
      {cols.map(c => (
        <div key={c} style={{
          fontFamily: "Times New Roman, Times, serif",
          fontSize: 10, fontWeight: 500, letterSpacing: "0.14em",
          color: C.t35, textTransform: "uppercase",
        }}>{c}</div>
      ))}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({ children, delay = 0 }: RowProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        borderBottom: `1px solid ${C.border}`,
        background: hovered ? "rgba(255,255,255,0.02)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      <div style={{ padding: "16px 28px" }}>{children}</div>
    </motion.div>
  );
}

// ─── Staff Table ──────────────────────────────────────────────────────────────
function StaffTable({ isAdmin }: StaffTableProps) {
  return (
    <DataCard
      accentColor={C.violet}
      headerContent={
        <CardHeader
          icon="◈"
          title="Staff Directory"
          subtitle="identity · access · permissions"
          count={MOCK_STAFF.length}
          accentColor={C.violet}
        />
      }
    >
      <ColBar
        cols={["Operator", "Email Address", "Access Level", "Actions"]}
        template="1.4fr 1.6fr 1fr 80px"
      />
      {MOCK_STAFF.map((person, i) => {
        const rc = roleConfig[person.role] || roleConfig.collector;
        return (
          <Row key={person.id} delay={i * 0.05}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.6fr 1fr 80px", alignItems: "center", gap: 16 }}>
              {/* Identity */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <HexAvatar name={`${person.first_name} ${person.last_name}`} email={person.email} />
                <div>
                  <div style={{
                    fontFamily: "Times New Roman, Times, serif",
                    fontWeight: 700, fontSize: 14, color: C.t90,
                  }}>{person.first_name} {person.last_name}</div>
                  <div style={{
                    fontFamily: "Times New Roman, Times, serif",
                    fontSize: 10, color: C.t35, marginTop: 1,
                  }}>UID-{String(person.id).padStart(4, "0")}</div>
                </div>
              </div>

              {/* Email */}
              <div style={{
                fontFamily: "Times New Roman, Times, serif",
                fontSize: 12, color: C.t60, letterSpacing: "0.02em",
              }}>{person.email}</div>

              {/* Role badge */}
              <GlowBadge color={rc.color} bg={rc.color + "15"}>
                <span style={{ color: rc.color + "80", fontSize: 8 }}>{rc.icon}</span>
                {rc.label}
              </GlowBadge>

              {/* Action */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <motion.button
                  whileHover={isAdmin ? { scale: 1.1, boxShadow: `0 0 20px ${C.violet}40` } : {}}
                  whileTap={isAdmin ? { scale: 0.95 } : {}}
                  disabled={!isAdmin}
                  style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: isAdmin ? C.violetDim : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isAdmin ? C.violet + "40" : C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isAdmin ? C.violet : C.t15,
                    cursor: isAdmin ? "pointer" : "not-allowed",
                    fontSize: 14, transition: "all 0.2s",
                  }}
                  title={isAdmin ? "Edit user" : "Admin required"}
                >
                  ✎
                </motion.button>
              </div>
            </div>
          </Row>
        );
      })}
    </DataCard>
  );
}

// ─── Observations Table ───────────────────────────────────────────────────────
function ObsTable() {
  return (
    <DataCard
      accentColor={C.cyan}
      headerContent={
        <CardHeader
          icon="⌘"
          title="Field Observations"
          subtitle="live crop monitoring · stress analysis · media"
          count={MOCK_OBS.length}
          accentColor={C.cyan}
        />
      }
    >
      <ColBar
        cols={["Field", "Crop Type", "Stress", "Recorded", "Media"]}
        template="1.4fr 1.2fr 1fr 1fr 80px"
      />
      {MOCK_OBS.map((obs, i) => {
        const stress = obs.crop_monitoring?.stress || "None";
        const sc = stressConfig[stress] || stressConfig.None;
        const imgCount = obs.images?.length || 0;

        return (
          <Row key={obs.id} delay={i * 0.05}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 1fr 1fr 80px", alignItems: "center", gap: 16 }}>
              {/* Field */}
              <div>
                <div style={{
                  fontFamily: "Times New Roman, Times, serif",
                  fontWeight: 700, fontSize: 14, color: C.t90,
                }}>{obs.field_name || 'Unknown'}</div>
              </div>

              {/* Crop */}
              <div>
                <div style={{
                  fontFamily: "Times New Roman, Times, serif",
                  fontWeight: 600, fontSize: 14, color: C.t90,
                }}>{obs.crop_information?.crop_type || 'Unknown'}</div>
                {obs.crop_information?.variety && (
                  <div style={{
                    fontFamily: "Times New Roman, Times, serif",
                    fontSize: 10, color: C.cyan + "80", marginTop: 1,
                  }}>{obs.crop_information.variety}</div>
                )}
              </div>

              {/* Stress */}
              <GlowBadge color={sc.color} bg={sc.bg}>
                <span style={{ fontSize: 9 }}>{sc.icon}</span>
                {sc.label}
              </GlowBadge>

              {/* Date */}
              <div style={{
                fontFamily: "Times New Roman, Times, serif",
                fontSize: 12, color: C.t60,
              }}>
                {new Date(obs.date_recorded).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </div>

              {/* Images */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 6,
                    background: imgCount > 0 ? C.goldDim : "rgba(255,255,255,0.03)",
                    border: `1px solid ${imgCount > 0 ? C.gold + "40" : C.border}`,
                    cursor: imgCount > 0 ? "pointer" : "default",
                  }}
                >
                  <span style={{ fontSize: 12 }}>🖼</span>
                  <span style={{
                    fontFamily: "Times New Roman, Times, serif",
                    fontSize: 11, fontWeight: 500,
                    color: imgCount > 0 ? C.gold : C.t35,
                  }}>{imgCount}</span>
                </motion.div>
              </div>
            </div>
          </Row>
        );
      })}
    </DataCard>
  );
}

// ─── Stat bar at the top ──────────────────────────────────────────────────────
function StatBar() {
  const stats = [
    { label: "Total Staff",       value: MOCK_STAFF.length,                          color: C.violet, icon: "◈" },
    { label: "Observations",      value: MOCK_OBS.length,                            color: C.cyan,   icon: "⌘" },
    { label: "Stressed Fields",   value: MOCK_OBS.filter(o => o.crop_monitoring?.stress !== "None").length, color: C.rose, icon: "▲" },
    { label: "Media Files",       value: MOCK_OBS.reduce((s, o) => s + (o.images?.length || 0), 0), color: C.gold, icon: "◉" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}
    >
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.5 }}
          whileHover={{ y: -3, boxShadow: `0 16px 40px ${s.color}15` }}
          style={{
            borderRadius: 14, padding: "20px 22px",
            background: C.surface,
            border: `1px solid ${s.color}20`,
            boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
            position: "relative", overflow: "hidden",
            transition: "box-shadow 0.3s",
            cursor: "default",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${s.color}50, transparent)` }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{
              fontFamily: "Times New Roman, Times, serif",
              fontSize: 10, letterSpacing: "0.12em",
              color: C.t35, textTransform: "uppercase",
            }}>{s.label}</div>
            <div style={{ fontSize: 14, color: s.color + "70" }}>{s.icon}</div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07 + 0.2, type: "spring", stiffness: 200 }}
            style={{
              fontFamily: "Times New Roman, Times, serif",
              fontWeight: 900, fontSize: 38, color: C.t90,
              letterSpacing: "-0.04em", lineHeight: 1,
            }}
          >
            {s.value}
          </motion.div>
          <div style={{
            marginTop: 10, height: 2, borderRadius: 2,
            background: "rgba(255,255,255,0.05)",
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(s.value / 10) * 100}%` }}
              transition={{ delay: i * 0.07 + 0.4, duration: 1, ease: "easeOut" }}
              style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${s.color}60, ${s.color})` }}
            />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Role banner ──────────────────────────────────────────────────────────────
function RoleBanner({ isAdmin, role }: RoleBannerProps) {
  const color = isAdmin ? C.gold : C.cyan;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5 }}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "16px 22px", borderRadius: 14, marginBottom: 32,
        background: C.surface,
        border: `1px solid ${color}25`,
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${color}, ${color}40)`, borderRadius: "12px 0 0 12px" }} />
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `${color}15`, border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, color,
      }}>⬡</div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "Times New Roman, Times, serif",
          fontWeight: 700, fontSize: 14, color: C.t90, marginBottom: 2,
        }}>
          Active Session —{" "}
          <span style={{ color }}>{role?.toUpperCase() || "UNKNOWN"}</span>
        </div>
        <div style={{
          fontFamily: "Times New Roman, Times, serif",
          fontSize: 11, color: C.t35,
        }}>
          {isAdmin
            ? "Full administrative privileges · All operations enabled"
            : "Role-based filtering active · Some operations restricted"}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <PulseDot color={color} size={10} />
        <span style={{
          fontFamily: "Times New Roman, Times, serif",
          fontSize: 11, fontWeight: 500, color,
          letterSpacing: "0.1em",
        }}>
          {isAdmin ? "ADMIN" : "RESTRICTED"}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────
function PageHeader() {
  const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString());
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 36, position: "relative" }}
    >
      {/* Label */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 28, height: 1.5, background: C.cyan, borderRadius: 2 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <PulseDot color={C.emerald} size={7} />
          <span style={{
            fontFamily: "Times New Roman, Times, serif",
            fontSize: 10, color: C.cyan + "80",
            letterSpacing: "0.18em", textTransform: "uppercase",
          }}>Live Supabase · TanStack Query</span>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span style={{
            fontFamily: "Times New Roman, Times, serif",
            fontSize: 10, color: C.t35, letterSpacing: "0.08em",
          }}>{currentTime}</span>
        </div>
      </div>

      {/* Title */}
      <h1 style={{
        fontFamily: "Times New Roman, Times, serif",
        fontWeight: 400, fontSize: "clamp(2rem, 4vw, 3rem)",
        color: C.t90, letterSpacing: "-0.02em",
        lineHeight: 1.05, margin: 0, marginBottom: 12,
      }}>
        Field Data{" "}
        <em style={{
          fontStyle: "italic", color: C.cyan,
          textShadow: `0 0 60px ${C.cyanGlow}`,
        }}>Explorer</em>
      </h1>

      <p style={{
        fontFamily: "Times New Roman, Times, serif",
        fontSize: 15, color: C.t60, maxWidth: 520, lineHeight: 1.65, margin: 0,
      }}>
        Real-time data pipeline from Supabase with TypeScript generics, TanStack Query caching, and role-based access control.
      </p>
    </motion.div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function DataDemoPage() {
  const isAdmin = true; // toggle to test restricted mode
  const role = "admin";

  return (
    <div style={{
      background: C.bg,
      minHeight: "100vh",
      padding: "48px 32px 80px",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        ${FONTS}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      `}</style>

      {/* Background effects */}
      <GridLines />
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `
          radial-gradient(ellipse 60% 40% at 10% 0%, rgba(34,211,238,0.04) 0%, transparent 60%),
          radial-gradient(ellipse 50% 40% at 90% 100%, rgba(167,139,250,0.04) 0%, transparent 55%),
          radial-gradient(ellipse 40% 30% at 50% 50%, rgba(245,158,11,0.02) 0%, transparent 50%)
        `,
      }} />

      {/* Floating orbs */}
      {[
        { top: "8%",  right: "5%",  size: 300, color: "rgba(34,211,238,0.04)"   },
        { top: "55%", left: "2%",   size: 250, color: "rgba(167,139,250,0.04)"  },
        { top: "80%", right: "20%", size: 200, color: "rgba(245,158,11,0.03)"   },
      ].map((orb, i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 10 + i * 3, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "fixed",
            top: orb.top, left: orb.left, right: orb.right,
            width: orb.size, height: orb.size,
            borderRadius: "50%",
            background: orb.color,
            filter: "blur(70px)",
            pointerEvents: "none", zIndex: 0,
          }}
        />
      ))}

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto" }}>
        <PageHeader />
        <RoleBanner isAdmin={isAdmin} role={role} />
        <StatBar />
        <StaffTable isAdmin={isAdmin} />
        <ObsTable />
      </div>
    </div>
  );
}
