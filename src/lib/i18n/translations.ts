export type SupportedLanguage = 'en' | 'de' | 'fr' | 'it';

export interface Translations {
    // Common
    common: {
        close: string;
        cancel: string;
        confirm: string;
        loading: string;
        error: string;
        save: string;
    };

    // Header
    header: {
        tagline: string;
        buyMeABeer: string;
        github: string;
    };

    // Start Screen
    start: {
        title: string;
        settings: string;
        language: string;
        apiKey: string;
        apiKeyPlaceholder: string;
        getApiKey: string;
        startGame: string;
        resumeGame: string;
        startNewGame: string;
        chooseCoach: string;
        importPosition: string;
        importPositionPlaceholder: string;
        formatDetected: string;
        formatFen: string;
        formatPgn: string;
        formatInvalid: string;
        apiKeyRequired: string;
        colorSelection: string;
        playAsWhite: string;
        playAsBlack: string;
        randomColor: string;
    };

    // Game
    game: {
        playingAs: string;
        vs: string;
        backToMenu: string;
        stockfishStrength: string;
        depth: string;
        undoMove: string;
        gameHistory: string;
        analyze: string;
        noMovesYet: string;
        white: string;
        black: string;
    };

    // Tutor
    tutor: {
        aiCoach: string;
        askCoach: string;
        hint: string;
        bestMove: string;
    };

    // Game Over
    gameOver: {
        title: string;
        checkmate: string;
        youWon: string;
        youLost: string;
        draw: string;
        stalemate: string;
        mistakes: string;
        aiSummary: string;
        move: string;
        evalBefore: string;
        evalAfter: string;
        bestMove: string;
        newGame: string;
    };

    // Analysis
    analysis: {
        title: string;
        currentPosition: string;
        evaluation: string;
        bestMove: string;
        aiAnalysis: string;
    };

    // API Key Input
    apiKeyInput: {
        title: string;
        description: string;
        placeholder: string;
        submit: string;
        getKey: string;
    };

    // Onboarding
    onboarding: {
        welcome: {
            title: string;
            subtitle: string;
            claim: string;
        };
        language: {
            title: string;
            description: string;
        };
        value: {
            title: string;
            bullets: string[];
        };
        api: {
            title: string;
            description: string;
            inputLabel: string;
            placeholder: string;
            storage: string;
            serverUse: string;
            costNote: string;
            privacy: string;
            getKey: string;
        };
        actions: {
            next: string;
            back: string;
            finish: string;
        };
        stepIndicator: (step: number, total: number) => string;
    };
}

const en: Translations = {
    common: {
        close: 'Close',
        cancel: 'Cancel',
        confirm: 'Confirm',
        loading: 'Loading...',
        error: 'Error',
        save: 'Save',
    },
    header: {
        tagline: 'with Gemini & Stockfish',
        buyMeABeer: 'Buy Me a Beer',
        github: 'GitHub',
    },
    start: {
        title: 'Chess Tutor AI',
        settings: '1. Settings',
        language: 'Language',
        apiKey: 'Google Gemini API Key',
        apiKeyPlaceholder: 'AIzaSy...',
        getApiKey: 'Get free key',
        startGame: '2. Start Game',
        resumeGame: 'Resume Previous Game',
        startNewGame: 'Start New Game instead...',
        chooseCoach: 'Choose Your Coach:',
        importPosition: 'Import Position or Game (FEN or PGN)',
        importPositionPlaceholder: 'Paste FEN position or PGN game here...',
        formatDetected: 'Format detected:',
        formatFen: 'FEN Position',
        formatPgn: 'PGN Game',
        formatInvalid: 'Invalid format - please paste a valid FEN or PGN',
        apiKeyRequired: 'Please enter a valid API Key to continue.',
        colorSelection: 'Choose Your Color:',
        playAsWhite: 'Play as White',
        playAsBlack: 'Play as Black',
        randomColor: 'Random',
    },
    game: {
        playingAs: 'Playing as',
        vs: 'vs',
        backToMenu: '← Back to Menu',
        stockfishStrength: 'Stockfish Strength',
        depth: 'Depth',
        undoMove: 'Undo Last Move',
        gameHistory: 'Game History',
        analyze: 'Analyze',
        noMovesYet: 'No moves yet.',
        white: 'White',
        black: 'Black',
    },
    tutor: {
        aiCoach: 'AI Coach',
        askCoach: 'Ask your coach...',
        hint: 'Hint',
        bestMove: 'Best Move',
    },
    gameOver: {
        title: 'Game Over',
        checkmate: 'Checkmate!',
        youWon: 'You won!',
        youLost: 'You lost.',
        draw: 'Draw!',
        stalemate: 'Stalemate!',
        mistakes: 'Your Mistakes',
        aiSummary: 'AI Summary',
        move: 'Move',
        evalBefore: 'Eval Before',
        evalAfter: 'Eval After',
        bestMove: 'Best Move',
        newGame: 'New Game',
    },
    analysis: {
        title: 'Position Analysis',
        currentPosition: 'Current Position',
        evaluation: 'Evaluation',
        bestMove: 'Best Move',
        aiAnalysis: 'AI Analysis',
    },
    apiKeyInput: {
        title: 'API Key Required',
        description: 'Please enter your Google Gemini API key to continue.',
        placeholder: 'Enter your API key...',
        submit: 'Submit',
        getKey: 'Get a free API key',
    },
    onboarding: {
        welcome: {
            title: 'Chess Tutor AI',
            subtitle: 'Your personal coach to level up your chess.',
            claim: 'Play, learn, and analyze with AI guidance powered by Gemini & Stockfish.',
        },
        language: {
            title: 'Choose your language',
            description: 'We will personalize your experience and future messages in the language you choose.',
        },
        value: {
            title: 'What you get',
            bullets: [
                'Practice with personalities that match your style.',
                'Import FEN or PGN to analyze games with live advice.',
                'Blend Google Gemini creativity with Stockfish precision.',
                'Keep your progress locally—resume anytime.',
            ],
        },
        api: {
            title: 'Add your LLM API key',
            description: 'We need your Gemini API key to generate coaching moves and explanations.',
            inputLabel: 'Google Gemini API Key',
            placeholder: 'AIzaSy...',
            storage: 'Your key is stored in your browser and never shared.',
            serverUse: 'We only send it to our server when making requests and never log it.',
            costNote: 'LLM tokens are billed by Google, so you control the usage.',
            privacy: 'We never use your key for anything outside this tutor.',
            getKey: 'Get a free Gemini API key',
        },
        actions: {
            next: 'Next',
            back: 'Back',
            finish: 'Save & start playing',
        },
        stepIndicator: (step: number, total: number) => `Step ${step} of ${total}`,
    },
};

const de: Translations = {
    common: {
        close: 'Schließen',
        cancel: 'Abbrechen',
        confirm: 'Bestätigen',
        loading: 'Lädt...',
        error: 'Fehler',
        save: 'Speichern',
    },
    header: {
        tagline: 'mit Gemini & Stockfish',
        buyMeABeer: 'Spendier mir ein Bier',
        github: 'GitHub',
    },
    start: {
        title: 'Chess Tutor AI',
        settings: '1. Einstellungen',
        language: 'Sprache',
        apiKey: 'Google Gemini API-Schlüssel',
        apiKeyPlaceholder: 'AIzaSy...',
        getApiKey: 'Kostenlosen Schlüssel erhalten',
        startGame: '2. Spiel starten',
        resumeGame: 'Vorheriges Spiel fortsetzen',
        startNewGame: 'Stattdessen neues Spiel starten...',
        chooseCoach: 'Wähle deinen Trainer:',
        importPosition: 'Position oder Partie importieren (FEN oder PGN)',
        importPositionPlaceholder: 'FEN-Position oder PGN-Partie hier einfügen...',
        formatDetected: 'Format erkannt:',
        formatFen: 'FEN-Position',
        formatPgn: 'PGN-Partie',
        formatInvalid: 'Ungültiges Format - bitte gültiges FEN oder PGN einfügen',
        apiKeyRequired: 'Bitte geben Sie einen gültigen API-Schlüssel ein, um fortzufahren.',
        colorSelection: 'Wähle deine Farbe:',
        playAsWhite: 'Als Weiß spielen',
        playAsBlack: 'Als Schwarz spielen',
        randomColor: 'Zufällig',
    },
    game: {
        playingAs: 'Spielst als',
        vs: 'gegen',
        backToMenu: '← Zurück zum Menü',
        stockfishStrength: 'Stockfish-Stärke',
        depth: 'Tiefe',
        undoMove: 'Letzten Zug rückgängig',
        gameHistory: 'Spielverlauf',
        analyze: 'Analysieren',
        noMovesYet: 'Noch keine Züge.',
        white: 'Weiß',
        black: 'Schwarz',
    },
    tutor: {
        aiCoach: 'KI-Trainer',
        askCoach: 'Frage deinen Trainer...',
        hint: 'Hinweis',
        bestMove: 'Bester Zug',
    },
    gameOver: {
        title: 'Spiel beendet',
        checkmate: 'Schachmatt!',
        youWon: 'Du hast gewonnen!',
        youLost: 'Du hast verloren.',
        draw: 'Remis!',
        stalemate: 'Patt!',
        mistakes: 'Deine Fehler',
        aiSummary: 'KI-Zusammenfassung',
        move: 'Zug',
        evalBefore: 'Bewertung vorher',
        evalAfter: 'Bewertung nachher',
        bestMove: 'Bester Zug',
        newGame: 'Neues Spiel',
    },
    analysis: {
        title: 'Stellungsanalyse',
        currentPosition: 'Aktuelle Stellung',
        evaluation: 'Bewertung',
        bestMove: 'Bester Zug',
        aiAnalysis: 'KI-Analyse',
    },
    apiKeyInput: {
        title: 'API-Schlüssel erforderlich',
        description: 'Bitte geben Sie Ihren Google Gemini API-Schlüssel ein, um fortzufahren.',
        placeholder: 'Geben Sie Ihren API-Schlüssel ein...',
        submit: 'Absenden',
        getKey: 'Kostenlosen API-Schlüssel erhalten',
    },
    onboarding: {
        welcome: {
            title: 'Chess Tutor AI',
            subtitle: 'Dein persönlicher Coach für den nächsten Spielzug.',
            claim: 'Spiele, lerne und analysiere mit KI-Unterstützung von Gemini & Stockfish.',
        },
        language: {
            title: 'Wähle deine Sprache',
            description: 'Wir passen das Erlebnis und zukünftige Nachrichten an deine Sprache an.',
        },
        value: {
            title: 'Deine Vorteile',
            bullets: [
                'Trainiere mit Persönlichkeiten, die zu deinem Stil passen.',
                'Importiere FEN oder PGN und erhalte Live-Hinweise zur Analyse.',
                'Kombiniere die Kreativität von Google Gemini mit der Präzision von Stockfish.',
                'Speichere deinen Fortschritt lokal – spiele jederzeit weiter.',
            ],
        },
        api: {
            title: 'Füge deinen LLM-API-Schlüssel hinzu',
            description: 'Wir benötigen deinen Gemini-API-Schlüssel, um Züge und Erklärungen zu generieren.',
            inputLabel: 'Google Gemini API-Schlüssel',
            placeholder: 'AIzaSy...',
            storage: 'Dein Schlüssel bleibt im Browser gespeichert und wird nicht geteilt.',
            serverUse: 'Wir senden ihn nur für Anfragen an unseren Server und protokollieren ihn nicht.',
            costNote: 'LLM-Tokens werden von Google abgerechnet – du behältst die Kontrolle.',
            privacy: 'Wir nutzen deinen Schlüssel ausschließlich für diesen Tutor.',
            getKey: 'Kostenlosen Gemini-Schlüssel holen',
        },
        actions: {
            next: 'Weiter',
            back: 'Zurück',
            finish: 'Speichern & starten',
        },
        stepIndicator: (step: number, total: number) => `Schritt ${step} von ${total}`,
    },
};

const fr: Translations = {
    common: {
        close: 'Fermer',
        cancel: 'Annuler',
        confirm: 'Confirmer',
        loading: 'Chargement...',
        error: 'Erreur',
        save: 'Enregistrer',
    },
    header: {
        tagline: 'avec Gemini & Stockfish',
        buyMeABeer: 'Offrez-moi une bière',
        github: 'GitHub',
    },
    start: {
        title: 'Chess Tutor AI',
        settings: '1. Paramètres',
        language: 'Langue',
        apiKey: 'Clé API Google Gemini',
        apiKeyPlaceholder: 'AIzaSy...',
        getApiKey: 'Obtenir une clé gratuite',
        startGame: '2. Démarrer la partie',
        resumeGame: 'Reprendre la partie précédente',
        startNewGame: 'Démarrer une nouvelle partie...',
        chooseCoach: 'Choisissez votre coach :',
        importPosition: 'Importer une position ou partie (FEN ou PGN)',
        importPositionPlaceholder: 'Collez une position FEN ou partie PGN ici...',
        formatDetected: 'Format détecté :',
        formatFen: 'Position FEN',
        formatPgn: 'Partie PGN',
        formatInvalid: 'Format invalide - veuillez coller un FEN ou PGN valide',
        apiKeyRequired: 'Veuillez entrer une clé API valide pour continuer.',
        colorSelection: 'Choisissez votre couleur :',
        playAsWhite: 'Jouer Blancs',
        playAsBlack: 'Jouer Noirs',
        randomColor: 'Aléatoire',
    },
    game: {
        playingAs: 'Jouant',
        vs: 'contre',
        backToMenu: '← Retour au menu',
        stockfishStrength: 'Force de Stockfish',
        depth: 'Profondeur',
        undoMove: 'Annuler le dernier coup',
        gameHistory: 'Historique de la partie',
        analyze: 'Analyser',
        noMovesYet: 'Aucun coup pour le moment.',
        white: 'Blancs',
        black: 'Noirs',
    },
    tutor: {
        aiCoach: 'Coach IA',
        askCoach: 'Demandez à votre coach...',
        hint: 'Indice',
        bestMove: 'Meilleur coup',
    },
    gameOver: {
        title: 'Partie terminée',
        checkmate: 'Échec et mat !',
        youWon: 'Vous avez gagné !',
        youLost: 'Vous avez perdu.',
        draw: 'Nulle !',
        stalemate: 'Pat !',
        mistakes: 'Vos erreurs',
        aiSummary: 'Résumé IA',
        move: 'Coup',
        evalBefore: 'Éval. avant',
        evalAfter: 'Éval. après',
        bestMove: 'Meilleur coup',
        newGame: 'Nouvelle partie',
    },
    analysis: {
        title: 'Analyse de position',
        currentPosition: 'Position actuelle',
        evaluation: 'Évaluation',
        bestMove: 'Meilleur coup',
        aiAnalysis: 'Analyse IA',
    },
    apiKeyInput: {
        title: 'Clé API requise',
        description: 'Veuillez entrer votre clé API Google Gemini pour continuer.',
        placeholder: 'Entrez votre clé API...',
        submit: 'Soumettre',
        getKey: 'Obtenir une clé API gratuite',
    },
    onboarding: {
        welcome: {
            title: 'Chess Tutor AI',
            subtitle: 'Votre coach personnel pour progresser aux échecs.',
            claim: 'Jouez, apprenez et analysez avec l’aide de Gemini et Stockfish.',
        },
        language: {
            title: 'Choisissez votre langue',
            description: 'Nous personnaliserons votre expérience et les messages dans la langue choisie.',
        },
        value: {
            title: 'Ce que vous obtenez',
            bullets: [
                'Entraînez-vous avec des personnalités adaptées à votre style.',
                'Importez du FEN ou du PGN et analysez vos parties avec des conseils en direct.',
                'Combinez la créativité de Google Gemini avec la précision de Stockfish.',
                'Gardez vos progrès en local et reprenez votre partie à tout moment.',
            ],
        },
        api: {
            title: 'Ajoutez votre clé API LLM',
            description: 'Nous avons besoin de votre clé Gemini pour générer des coups et des explications.',
            inputLabel: 'Clé API Google Gemini',
            placeholder: 'AIzaSy...',
            storage: 'Votre clé est stockée dans votre navigateur et n’est jamais partagée.',
            serverUse: 'Elle n’est envoyée au serveur que pour les requêtes et n’est jamais journalisée.',
            costNote: 'Les jetons LLM sont facturés par Google, vous gardez le contrôle.',
            privacy: 'Nous n’utilisons votre clé que pour ce tuteur.',
            getKey: 'Obtenir une clé Gemini gratuite',
        },
        actions: {
            next: 'Suivant',
            back: 'Retour',
            finish: 'Enregistrer et commencer',
        },
        stepIndicator: (step: number, total: number) => `Étape ${step} sur ${total}`,
    },
};

const it: Translations = {
    common: {
        close: 'Chiudi',
        cancel: 'Annulla',
        confirm: 'Conferma',
        loading: 'Caricamento...',
        error: 'Errore',
        save: 'Salva',
    },
    header: {
        tagline: 'con Gemini & Stockfish',
        buyMeABeer: 'Offrimi una birra',
        github: 'GitHub',
    },
    start: {
        title: 'Chess Tutor AI',
        settings: '1. Impostazioni',
        language: 'Lingua',
        apiKey: 'Chiave API Google Gemini',
        apiKeyPlaceholder: 'AIzaSy...',
        getApiKey: 'Ottieni chiave gratuita',
        startGame: '2. Inizia partita',
        resumeGame: 'Riprendi partita precedente',
        startNewGame: 'Inizia nuova partita...',
        chooseCoach: 'Scegli il tuo allenatore:',
        importPosition: 'Importa posizione o partita (FEN o PGN)',
        importPositionPlaceholder: 'Incolla posizione FEN o partita PGN qui...',
        formatDetected: 'Formato rilevato:',
        formatFen: 'Posizione FEN',
        formatPgn: 'Partita PGN',
        formatInvalid: 'Formato non valido - incolla un FEN o PGN valido',
        apiKeyRequired: 'Inserisci una chiave API valida per continuare.',
        colorSelection: 'Scegli il tuo colore:',
        playAsWhite: 'Gioca Bianco',
        playAsBlack: 'Gioca Nero',
        randomColor: 'Casuale',
    },
    game: {
        playingAs: 'Giocando',
        vs: 'contro',
        backToMenu: '← Torna al menu',
        stockfishStrength: 'Forza di Stockfish',
        depth: 'Profondità',
        undoMove: 'Annulla ultima mossa',
        gameHistory: 'Cronologia partita',
        analyze: 'Analizza',
        noMovesYet: 'Nessuna mossa ancora.',
        white: 'Bianco',
        black: 'Nero',
    },
    tutor: {
        aiCoach: 'Allenatore IA',
        askCoach: 'Chiedi al tuo allenatore...',
        hint: 'Suggerimento',
        bestMove: 'Mossa migliore',
    },
    gameOver: {
        title: 'Partita terminata',
        checkmate: 'Scacco matto!',
        youWon: 'Hai vinto!',
        youLost: 'Hai perso.',
        draw: 'Patta!',
        stalemate: 'Stallo!',
        mistakes: 'I tuoi errori',
        aiSummary: 'Riepilogo IA',
        move: 'Mossa',
        evalBefore: 'Val. prima',
        evalAfter: 'Val. dopo',
        bestMove: 'Mossa migliore',
        newGame: 'Nuova partita',
    },
    analysis: {
        title: 'Analisi posizione',
        currentPosition: 'Posizione attuale',
        evaluation: 'Valutazione',
        bestMove: 'Mossa migliore',
        aiAnalysis: 'Analisi IA',
    },
    apiKeyInput: {
        title: 'Chiave API richiesta',
        description: 'Inserisci la tua chiave API Google Gemini per continuare.',
        placeholder: 'Inserisci la tua chiave API...',
        submit: 'Invia',
        getKey: 'Ottieni chiave API gratuita',
    },
    onboarding: {
        welcome: {
            title: 'Chess Tutor AI',
            subtitle: 'Il tuo coach personale per migliorare negli scacchi.',
            claim: 'Gioca, impara e analizza con il supporto di Gemini e Stockfish.',
        },
        language: {
            title: 'Scegli la tua lingua',
            description: "Personalizzeremo l'esperienza e i messaggi nella lingua selezionata.",
        },
        value: {
            title: 'Cosa ottieni',
            bullets: [
                'Allenati con personalità che si adattano al tuo stile.',
                'Importa FEN o PGN e analizza le partite con suggerimenti in tempo reale.',
                'Unisci la creatività di Google Gemini con la precisione di Stockfish.',
                'Conserva i tuoi progressi in locale e riprendi quando vuoi.',
            ],
        },
        api: {
            title: 'Aggiungi la tua chiave API LLM',
            description: 'Abbiamo bisogno della tua chiave Gemini per generare mosse e spiegazioni.',
            inputLabel: 'Chiave API Google Gemini',
            placeholder: 'AIzaSy...',
            storage: 'La chiave viene salvata nel tuo browser e non viene condivisa.',
            serverUse: 'La inviamo solo per le richieste e non la registriamo mai.',
            costNote: 'I token LLM sono fatturati da Google, quindi hai tu il controllo.',
            privacy: 'Usiamo la tua chiave solo per questo tutor.',
            getKey: 'Ottieni una chiave Gemini gratuita',
        },
        actions: {
            next: 'Avanti',
            back: 'Indietro',
            finish: 'Salva e inizia',
        },
        stepIndicator: (step: number, total: number) => `Passo ${step} di ${total}`,
    },
};

export const translations: Record<SupportedLanguage, Translations> = {
    en,
    de,
    fr,
    it,
};
