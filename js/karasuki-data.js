
window.KARASUKI_DATA = {
  startRoom: "room_03",

  rooms: {
    // ── ROW 1 ──────────────────────────────────────────────
    room_01: {
      bg: "assets/img/karasuki/room_01.webp",
      spawns: {
        default:   { x: 732,  y: 876  },
        fromLeft:  { x: 200,  y: 658  },
        fromRight: { x: 1400, y: 658  },
        fromUp:    { x: 1084, y: 220  },
        fromDown:  { x: 732,  y: 876  }
      }
    },

    room_02: {
      bg: "assets/img/karasuki/room_02.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 210,  y: 255  },
        fromRight: { x: 1390, y: 727  },
        fromUp:    { x: 765,  y: 200  },
        fromDown:  { x: 732,  y: 876  }
      }
    },

    room_03: {
      bg: "assets/img/karasuki/room_03.webp",
      spawns: {
        default:   { x: 732,  y: 876  },
        fromLeft:  { x: 280,  y: 328  },
        fromRight: { x: 1150, y: 237  },
        fromUp:    { x: 785,  y: 240  },
        fromDown:  { x: 732,  y: 820  }
      }
    },

    room_04: {
      bg: "assets/img/karasuki/room_04.webp",
      exits: {
        up:    { x: 548,  y: 169 },
        right: { x: 1443, y: 734 },
        left:  { x: 94,   y: 635 }
      },
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 124,  y: 642  },
        fromRight: { x: 1390, y: 658  },
        fromUp:    { x: 436,  y: 218  },
        fromDown:  { x: 732,  y: 876  }
      }
    },

    room_05: {
      bg: "assets/img/karasuki/room_05.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 280,  y: 328  },
        fromRight: { x: 1390, y: 658  },
        fromUp:    { x: 785,  y: 240  },
        fromDown:  { x: 732,  y: 876  }
      }
    },

    // ── ROW 2 ──────────────────────────────────────────────
    room_06: {
      bg: "assets/img/karasuki/room_06.webp",
      exits: {
        down: { x: 623, y: 937 }
      },
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 200,  y: 684  },
        fromRight: { x: 1400, y: 684  },
        fromUp:    { x: 1096, y: 200  },
        fromDown:  { x: 623,  y: 620  }
      }
    },

    room_07: {
      bg: "assets/img/karasuki/room_07.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 100,  y: 687  },
        fromRight: { x: 1420, y: 615  },
        fromUp:    { x: 555,  y: 220  },
        fromDown:  { x: 901,  y: 820  }
      }
    },

    room_08: {
      bg: "assets/img/karasuki/room_08.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 110,  y: 809  },
        fromRight: { x: 1450, y: 597  },
        fromUp:    { x: 992,  y: 220  },
        fromDown:  { x: 860,  y: 810  }
      },
      hotspots: [
        {
          id: "profile-portal",
          x: 357,
          y: 342,
          type: "portal",
          href: "adventure-profile.html",
          popup: {
            en: "Do you want to go to your profile page?",
            ja: "プロフィールページに行きますか？",
            kanji: "貴方の横顔の頁へ参りますか？"
          }
        }
      ]
    },

    room_09: {
      bg: "assets/img/karasuki/room_09.webp",
      exits: {
        right: { x: 1365, y: 224 },
        down:  { x: 918,  y: 883 }
      },
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 120,  y: 702  },
        fromRight: { x: 1365, y: 224  },
        fromUp:    { x: 449,  y: 240  },
        fromDown:  { x: 918,  y: 820  }
      }
    },

    room_10: {
      bg: "assets/img/karasuki/room_10.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 120,  y: 702  },
        fromRight: { x: 1400, y: 700  },
        fromUp:    { x: 838,  y: 240  },
        fromDown:  { x: 776,  y: 820  }
      }
    },

    // ── ROW 3 ──────────────────────────────────────────────
    room_11: {
      bg: "assets/img/karasuki/room_11.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 200,  y: 312  },
        fromRight: { x: 1300, y: 312  },
        fromUp:    { x: 732,  y: 200  },
        fromDown:  { x: 804,  y: 820  }
      }
    },

    room_12: {
      bg: "assets/img/karasuki/room_12.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 240,  y: 344  },
        fromRight: { x: 1420, y: 716  },
        fromUp:    { x: 732,  y: 200  },
        fromDown:  { x: 751,  y: 840  }
      }
    },

    room_13: {
      bg: "assets/img/karasuki/room_13.webp",
      exits: {
        right: { x: 1421, y: 242 },
        left:  { x: 88,   y: 568 },
        down:  { x: 910,  y: 913 }
      },
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 88,   y: 568  },
        fromRight: { x: 1421, y: 242  },
        fromUp:    { x: 732,  y: 200  },
        fromDown:  { x: 910,  y: 840  }
      }
    },

    room_14: {
      bg: "assets/img/karasuki/room_14.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 240,  y: 344  },
        fromRight: { x: 1420, y: 716  },
        fromUp:    { x: 732,  y: 200  },
        fromDown:  { x: 751,  y: 840  }
      }
    },

    room_15: {
      bg: "assets/img/karasuki/room_15.webp",
      exits: {
        left: { x: 88,  y: 568 },
        down: { x: 663, y: 894 }
      },
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 88,   y: 568  },
        fromRight: { x: 1420, y: 716  },
        fromUp:    { x: 732,  y: 200  },
        fromDown:  { x: 663,  y: 840  }
      }
    }
  },

  overlays: {}
};


/* ─────────────────────────────────────────────────────────────────
   ROOM 08 — PROFILE PORTAL HOTSPOT
   Renders a color-shifting glow orb at (357, 342).
   On click: shows a dark popup in EN / JA / Kanji.
   On confirm: navigates to adventure-profile.html
   ───────────────────────────────────────────────────────────────── */
(function initProfilePortal() {
  function mountPortal(container) {
    const HOTSPOT = { x: 357, y: 342 };

    /* ── orb ── */
    const orb = document.createElement("div");
    orb.id = "profile-portal-orb";
    Object.assign(orb.style, {
      position:     "absolute",
      left:         HOTSPOT.x + "px",
      top:          HOTSPOT.y + "px",
      width:        "22px",
      height:       "22px",
      borderRadius: "50%",
      transform:    "translate(-50%, -50%)",
      cursor:       "pointer",
      zIndex:       "50",
      animation:    "orbPulse 3s ease-in-out infinite",
      pointerEvents:"all"
    });
    container.appendChild(orb);

    /* ── popup overlay ── */
    const overlay = document.createElement("div");
    overlay.id = "profile-portal-overlay";
    Object.assign(overlay.style, {
      display:        "none",
      position:       "fixed",
      inset:          "0",
      zIndex:         "9999",
      alignItems:     "center",
      justifyContent: "center",
      background:     "rgba(0,0,0,0.72)"
    });

    const box = document.createElement("div");
    Object.assign(box.style, {
      background:   "#0d0d0d",
      border:       "1px solid #2a1a2e",
      borderRadius: "4px",
      padding:      "36px 44px",
      maxWidth:     "420px",
      width:        "90%",
      textAlign:    "center",
      boxShadow:    "0 0 40px rgba(90,0,120,0.5), 0 0 80px rgba(90,0,120,0.2)",
      fontFamily:   "'Georgia', serif",
      color:        "#c9b8d4"
    });

    box.innerHTML = `
      <p style="font-size:1.05rem;margin:0 0 6px;letter-spacing:.03em;color:#ddd;">
        Do you want to go to your profile page?
      </p>
      <p style="font-size:.88rem;margin:0 0 4px;color:#a08ab0;">
        プロフィールページに行きますか？
      </p>
      <p style="font-size:.82rem;margin:0 0 28px;color:#7a6080;letter-spacing:.06em;">
        貴方の横顔の頁へ参りますか？
      </p>
      <div style="display:flex;justify-content:center;gap:20px;">
        <button id="portal-yes" style="
          background:transparent;border:1px solid #6a2a8a;color:#c9b8d4;
          padding:8px 28px;cursor:pointer;font-size:.9rem;letter-spacing:.08em;
          font-family:inherit;transition:background .2s,color .2s;">
          Yes
        </button>
        <button id="portal-no" style="
          background:transparent;border:1px solid #3a2a3a;color:#6a5a72;
          padding:8px 28px;cursor:pointer;font-size:.9rem;letter-spacing:.08em;
          font-family:inherit;transition:background .2s,color .2s;">
          No
        </button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    /* ── keyframes injected once ── */
    if (!document.getElementById("karasuki-portal-styles")) {
      const style = document.createElement("style");
      style.id = "karasuki-portal-styles";
      style.textContent = `
        @keyframes orbPulse {
          0%   { box-shadow: 0 0 8px 4px #8b00ff, 0 0 18px 8px rgba(139,0,255,.3);  background: #9b30ff; }
          20%  { box-shadow: 0 0 8px 4px #00bfff, 0 0 18px 8px rgba(0,191,255,.3);  background: #30d0ff; }
          40%  { box-shadow: 0 0 8px 4px #ff007f, 0 0 18px 8px rgba(255,0,127,.3);  background: #ff40a0; }
          60%  { box-shadow: 0 0 8px 4px #00ff99, 0 0 18px 8px rgba(0,255,153,.3);  background: #30ffaa; }
          80%  { box-shadow: 0 0 8px 4px #ffaa00, 0 0 18px 8px rgba(255,170,0,.3);  background: #ffcc40; }
          100% { box-shadow: 0 0 8px 4px #8b00ff, 0 0 18px 8px rgba(139,0,255,.3);  background: #9b30ff; }
        }
        #portal-yes:hover { background: rgba(106,42,138,.35); color: #fff; }
        #portal-no:hover  { background: rgba(58,42,58,.4);    color: #bbb; }
        #profile-portal-overlay { display: none; }
        #profile-portal-overlay.active { display: flex; }
      `;
      document.head.appendChild(style);
    }

    /* ── events ── */
    orb.addEventListener("click", () => overlay.classList.add("active"));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("active"); });
    document.getElementById("portal-yes").addEventListener("click", () => {
      window.location.href = "adventure-profile.html";
    });
    document.getElementById("portal-no").addEventListener("click", () => {
      overlay.classList.remove("active");
    });
  }

  /* Wait for the room_08 container to exist, then mount */
  function tryMount() {
    const container = document.querySelector('[data-room="room_08"] .room-layer, #room_08, .room-08-container');
    if (container) {
      mountPortal(container);
    } else {
      /* Fallback: attach to body with fixed positioning if container not found */
      console.warn("[KarasukiPortal] room_08 container not found — portal will mount on room change event.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryMount);
  } else {
    tryMount();
  }

  /* If your engine fires a custom event when rooms load, re-mount then */
  document.addEventListener("karasuki:roomEnter", function(e) {
    if (e.detail && e.detail.room === "room_08") {
      const existing = document.getElementById("profile-portal-orb");
      if (!existing) tryMount();
    }
  });
})();
