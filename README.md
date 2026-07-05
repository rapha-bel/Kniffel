# 🎲 Kniffel Block

Ein digitaler Kniffel-Punkteblock als **PWA** (Progressive Web App). Du trägst nur die
Punkte ein – **Zwischensumme, Bonus (ab 63 → +35) und Gesamtsumme** werden automatisch
berechnet. Läuft komplett **offline** auf dem iPhone, ohne App Store.

## Funktionen
- Mehrere Spieler (hinzufügen/umbenennen/löschen über 👥)
- Antippen einer Zelle → Wert wählen oder eigenen Wert eingeben, „×" = gestrichen
- Automatischer Bonus + Gesamtsumme, 👑 markiert den Führenden
- Punkte werden lokal gespeichert (bleiben nach dem Schließen erhalten)
- Neues Spiel über 🔄 (Spieler bleiben)

## Lokal ausprobieren (am Mac)
```bash
node .claude/server.js
# dann http://localhost:8123 im Browser öffnen
```

## Auf dem iPhone installieren (empfohlen: GitHub Pages)
Für echten Offline-Betrieb braucht die App eine HTTPS-Adresse. Am einfachsten kostenlos über GitHub Pages:

1. Repo zu GitHub pushen.
2. Auf GitHub: **Settings → Pages → Branch: `main`, Ordner `/root`** → Save.
3. Nach ein paar Minuten ist die App unter `https://<dein-name>.github.io/Kniffel/` erreichbar.
4. Diese URL in **Safari** auf dem iPhone öffnen.
5. Teilen-Symbol → **„Zum Home-Bildschirm"** → fertig. Das Icon startet die App im
   Vollbild und funktioniert danach auch ohne Internet.

> Hinweis: Über eine lokale `http://…`-LAN-Adresse registriert iOS den Service Worker nicht
> (kein sicherer Kontext), daher klappt echter Offline-Betrieb nur über HTTPS / GitHub Pages.

## Dateien
| Datei | Zweck |
|-------|-------|
| `index.html` | Aufbau der Seite |
| `styles.css` | Design |
| `app.js` | Spiel-/Rechenlogik & Speicherung |
| `manifest.json` | PWA-Metadaten (Name, Icons, Farben) |
| `sw.js` | Service Worker für Offline-Caching |
| `icons/` | App-Icons |
