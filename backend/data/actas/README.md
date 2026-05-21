# Actas de mercancía en mal estado

Esta carpeta se sirve estáticamente bajo `/actas/` (ver `server.js`).

## Archivos esperados

```
actas/
├── acta-original.pdf       ← formato oficial TALMA (ACM). Se descarga
│                              desde el botón "Descargar PDF" del modal.
├── volante-original.pdf    ← Volante TALMA (aviso de llegada). Se abre
│                              desde el botón "Ver PDF" del modal de Aviso
│                              de llegada en la tabla de guías. Copiar aquí
│                              el archivo VOLANTE.pdf.
└── photos/
    ├── foto-1.jpg
    ├── foto-2.jpg
    ├── foto-3.jpg
    ├── foto-4.jpg
    └── foto-5.jpg
```

## Fotos para demo

El usuario subirá las 5 fotos reales del PDF `fotos 00653272450.pdf` aquí.
Todas las guías con `bultos_mal_estado > 0` referencian el mismo set
(simplificación para la demo).

## PDF original

Copiar el archivo `ACM (1).pdf` (formato oficial TALMA) a esta carpeta como
`acta-original.pdf`. Se sirve sin transformación bajo `/actas/acta-original.pdf`.
