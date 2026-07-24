const fs = require('fs');
const path = require('path');

const stitchDir = path.join(__dirname, '..', 'src', 'views');
const indexFile = path.join(__dirname, '..', 'public', 'index.html');

const views = [
  'neev_fln_onboarding',
  'neev_fln_login',
  'neev_fln_dashboard',
  'neev_fln_numeracy_assessment',
  'neev_fln_assessment_results',
  'neev_fln_admin_assessors',
  'neev_fln_register_student',
  'neev_fln_school_admin_dashboard',
  'neev_fln_super_admin_dashboard',
  'neev_fln_stakeholder_dashboard'
];

let mainHtml = `<!DOCTYPE html>
<html class="h-full" lang="en">
<head>
    <meta charset="utf-8"/>
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <meta name="theme-color" content="#30628a" />
    <link rel="manifest" href="manifest.json" />
    <link rel="icon" type="image/png" href="assets/images/neev_logo.png" />
    <link rel="apple-touch-icon" href="assets/images/neev_logo.png" />
    <title>Neev FLN Assessor</title>
    
    <!-- Instant Performance Optimization: Preconnect & Non-Blocking Font Swap -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preconnect" href="https://cdn.tailwindcss.com" />

    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;700&family=Outfit:wght@400;500;700&display=swap" rel="stylesheet"/>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
    <link href="style.css" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    
    <style>
        .view-section { display: none !important; }
        .view-section.active { display: flex !important; }
    </style>
</head>
<body class="h-full bg-[#f9f9f9] text-[#1a1c1c] flex flex-col min-h-screen">
`;

for (let view of views) {
    const codeFile = path.join(stitchDir, view, 'code.html');
    if (fs.existsSync(codeFile)) {
        const content = fs.readFileSync(codeFile, 'utf8');
        
        // Ensure tailwind config is added only once if needed (though we can rely on index.css mostly or parse it)
        if (view === 'neev_fln_onboarding') {
            const tailwindConfig = content.match(/<script id="tailwind-config">([\s\S]*?)<\/script>/i);
            if (tailwindConfig && tailwindConfig[0]) {
                mainHtml = mainHtml.replace('</head>', `    ${tailwindConfig[0]}\n</head>`);
            }
        }
        
        // Extract content between <body ...> and the last </body>
        let viewContent = "";
        const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (bodyMatch && bodyMatch[1]) {
            viewContent = bodyMatch[1].trim();
        } else {
            // Fallback: strip html/head/body tags
            viewContent = content
                .replace(/<!DOCTYPE[^>]*>/gi, '')
                .replace(/<html[^>]*>/gi, '')
                .replace(/<\/html>/gi, '')
                .replace(/<head[\s\S]*?<\/head>/gi, '')
                .replace(/<body[^>]*>/gi, '')
                .replace(/<\/body>/gi, '')
                .trim();
        }

        mainHtml += `\n<!-- VIEW: ${view} -->\n<div id="view-${view}" class="view-section flex-col h-full">\n${viewContent}\n</div>\n`;
    }
}

mainHtml += `
    <!-- App Logic Scripts -->
    <script type="module" src="js/core/app.js"></script>
</body>
</html>
`;

fs.writeFileSync(indexFile, mainHtml);
console.log('Successfully built index.html with stitch views');
