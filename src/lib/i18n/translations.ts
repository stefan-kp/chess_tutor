export type SupportedLanguage = 'en' | 'de' | 'fr' | 'it' | 'pl';

export interface Translations {
    // Common
    common: {
        close: string;
        cancel: string;
        confirm: string;
        loading: string;
        error: string;
        save: string;
        clearAllData: string;
        clearAllDataConfirm: string;
        clearAllDataDescription: string;
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
        analyzeGame: string;
        learningArea: string;
        savedGamesTitle: string;
        savedGamesEmpty: string;
        opponentLabel: string;
        evaluationLabel: string;
        noEvaluation: string;
        deleteGame: string;
        analyzeThisGame: string;
    };

    // Game
    game: {
        playingAs: string;
        vs: string;
        backToMenu: string;
        stockfishStrength: string;
        depth: string;
        undoMove: string;
        resign: string;
        resignConfirm: string;
        resignation: string;
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
        playFromHere: string;
        playDescription: string;
        chooseOpponent: string;
        chooseSide: string;
        chooseStrength: string;
        startPlay: string;
        modeTitle: string;
        modeDescription: string;
        pasteLabel: string;
        pastePlaceholder: string;
        chooseCoach: string;
        orientation: string;
        startButton: string;
        next: string;
        previous: string;
        step: string;
        missedTactics: string;
        cpLoss: string;
        none: string;
        opening: string;
        enginePending: string;
        coachPending: string;
        importError: string;
        loadNewGame: string;
        openingsExplorer: string;
        generatingExplanation: string;
        noApiKey: string;
        askFollowUp: string;
        possibleOpenings: string;
        downloadGame: string;
        downloadPGN: string;
        downloadFEN: string;
        downloadTitle: string;
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

    // Learning Area
    learning: {
        title: string;
        subtitle: string;
        tacticalPatterns: string;
        openings: string;
        comingSoon: string;
        backToMenu: string;
        patterns: {
            pin: string;
            skewer: string;
            fork: string;
            discoveredCheck: string;
            doubleAttack: string;
            overloading: string;
            backRankWeakness: string;
            trappedPiece: string;
        };
        practice: {
            title: string;
            hint: string;
            makeYourMove: string;
            correct: string;
            incorrect: string;
            tryAgain: string;
            nextExercise: string;
            backToLearning: string;
            findTheMove: string;
        };
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
        clearAllData: 'Clear All Data',
        clearAllDataConfirm: 'Are you sure you want to clear all data? This will delete all saved games, settings, and usernames. This action cannot be undone.',
        clearAllDataDescription: 'Remove all saved games, settings, and cached data from your browser.',
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
        startGame: 'Start Game',
        resumeGame: 'Resume Previous Game',
        startNewGame: 'Start New Game',
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
        analyzeGame: 'Analyze a Game',
        learningArea: 'Learning Area',
        savedGamesTitle: 'Unfinished games',
        savedGamesEmpty: 'No unfinished games yet.',
        opponentLabel: 'Opponent',
        evaluationLabel: 'Evaluation',
        noEvaluation: 'No evaluation yet',
        deleteGame: 'Delete game',
        analyzeThisGame: 'Analyze this game',
    },
    game: {
        playingAs: 'Playing as',
        vs: 'vs',
        backToMenu: '← Back to Menu',
        stockfishStrength: 'Stockfish Strength',
        depth: 'Depth',
        undoMove: 'Undo Last Move',
        resign: 'Resign',
        resignConfirm: 'Are you sure you want to resign? This action cannot be undone.',
        resignation: 'You resigned.',
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
        playFromHere: 'Play from this position',
        playDescription: 'Pick a character, side, and engine strength to continue playing from the current move.',
        chooseOpponent: 'Choose your opponent',
        chooseSide: 'Choose your color',
        chooseStrength: 'Opponent strength',
        startPlay: 'Start from here',
        modeTitle: 'Analyze an Existing Game',
        modeDescription: 'Upload a PGN or FEN and let your coach walk you through every move with engine-backed insights.',
        pasteLabel: 'PGN or FEN Input',
        pastePlaceholder: 'Paste PGN or FEN here to review the game move by move...',
        chooseCoach: 'Choose Coach Personality',
        orientation: 'Board Orientation',
        startButton: 'Start Analysis',
        next: 'Next Move',
        previous: 'Previous Move',
        step: 'Move',
        missedTactics: 'Missed Tactics',
        cpLoss: 'Evaluation Change',
        none: 'None detected',
        opening: 'Opening',
        enginePending: 'Running engine evaluation...',
        coachPending: 'Coach is preparing feedback...',
        importError: 'Could not load that PGN or FEN. Please check the notation.',
        loadNewGame: 'Load New Game',
        openingsExplorer: 'Opening Explorer',
        generatingExplanation: 'Generating explanation...',
        noApiKey: 'Please add an API key in settings to get opening explanations.',
        askFollowUp: 'Ask a follow-up question about this opening...',
        possibleOpenings: 'possible openings',
        downloadGame: 'Download Game',
        downloadPGN: 'Download as PGN',
        downloadFEN: 'Download Current Position (FEN)',
        downloadTitle: 'Export Game',
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
    learning: {
        title: 'Learning Area',
        subtitle: 'Practice tactical patterns and openings',
        tacticalPatterns: 'Tactical Patterns',
        openings: 'Openings',
        comingSoon: 'Coming Soon',
        backToMenu: 'Back to Menu',
        patterns: {
            pin: 'Pin',
            skewer: 'Skewer',
            fork: 'Fork',
            discoveredCheck: 'Discovered Check',
            doubleAttack: 'Double Attack',
            overloading: 'Overloading',
            backRankWeakness: 'Back Rank Weakness',
            trappedPiece: 'Trapped Piece',
        },
        practice: {
            title: 'Tactical Practice',
            hint: 'Hint',
            makeYourMove: 'Make your move on the board',
            correct: 'Correct! Well done!',
            incorrect: 'Not quite. Try again!',
            tryAgain: 'Try Again',
            nextExercise: 'Next Exercise',
            backToLearning: 'Back to Learning Area',
            findTheMove: 'Find the move that creates a',
        },
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
        clearAllData: 'Alle Daten löschen',
        clearAllDataConfirm: 'Sind Sie sicher, dass Sie alle Daten löschen möchten? Dies löscht alle gespeicherten Spiele, Einstellungen und Benutzernamen. Diese Aktion kann nicht rückgängig gemacht werden.',
        clearAllDataDescription: 'Alle gespeicherten Spiele, Einstellungen und zwischengespeicherten Daten aus Ihrem Browser entfernen.',
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
        startGame: 'Spiel starten',
        resumeGame: 'Vorheriges Spiel fortsetzen',
        startNewGame: 'Neues Spiel starten',
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
        analyzeGame: 'Partie analysieren',
        learningArea: 'Lernbereich',
        savedGamesTitle: 'Unfertige Partien',
        savedGamesEmpty: 'Keine unfertigen Partien vorhanden.',
        opponentLabel: 'Gegner',
        evaluationLabel: 'Bewertung',
        noEvaluation: 'Keine Bewertung',
        deleteGame: 'Partie löschen',
        analyzeThisGame: 'Diese Partie analysieren',
    },
    game: {
        playingAs: 'Spielst als',
        vs: 'gegen',
        backToMenu: '← Zurück zum Menü',
        stockfishStrength: 'Stockfish-Stärke',
        depth: 'Tiefe',
        undoMove: 'Letzten Zug rückgängig',
        resign: 'Aufgeben',
        resignConfirm: 'Möchtest du wirklich aufgeben? Diese Aktion kann nicht rückgängig gemacht werden.',
        resignation: 'Du hast aufgegeben.',
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
        playFromHere: 'Von dieser Stellung spielen',
        playDescription: 'Wähle Charakter, Farbe und Engine-Stärke, um ab dem aktuellen Zug weiterzuspielen.',
        chooseOpponent: 'Gegner auswählen',
        chooseSide: 'Wähle deine Farbe',
        chooseStrength: 'Stärke des Gegners',
        startPlay: 'Hier weiterspielen',
        modeTitle: 'Bestehende Partie analysieren',
        modeDescription: 'PGN oder FEN hochladen und vom Coach mit Engine-Unterstützung durch die Partie führen lassen.',
        pasteLabel: 'PGN- oder FEN-Eingabe',
        pastePlaceholder: 'PGN oder FEN hier einfügen, um die Partie Zug für Zug anzusehen...',
        chooseCoach: 'Coach-Persönlichkeit wählen',
        orientation: 'Brettausrichtung',
        startButton: 'Analyse starten',
        next: 'Nächster Zug',
        previous: 'Vorheriger Zug',
        step: 'Zug',
        missedTactics: 'Verpasste Taktiken',
        cpLoss: 'Bewertungsänderung',
        none: 'Keine erkannt',
        opening: 'Eröffnung',
        enginePending: 'Engine-Bewertung läuft...',
        coachPending: 'Coach bereitet Feedback vor...',
        importError: 'PGN oder FEN konnte nicht geladen werden. Bitte Notation prüfen.',
        loadNewGame: 'Neue Partie laden',
        openingsExplorer: 'Eröffnungs-Explorer',
        generatingExplanation: 'Erklärung wird generiert...',
        noApiKey: 'Bitte fügen Sie in den Einstellungen einen API-Schlüssel hinzu.',
        askFollowUp: 'Stellen Sie eine Folgefrage zu dieser Eröffnung...',
        possibleOpenings: 'mögliche Eröffnungen',
        downloadGame: 'Partie herunterladen',
        downloadPGN: 'Als PGN herunterladen',
        downloadFEN: 'Aktuelle Position herunterladen (FEN)',
        downloadTitle: 'Partie exportieren',
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
    learning: {
        title: 'Lernbereich',
        subtitle: 'Übe taktische Muster und Eröffnungen',
        tacticalPatterns: 'Taktische Muster',
        openings: 'Eröffnungen',
        comingSoon: 'Demnächst',
        backToMenu: 'Zurück zum Menü',
        patterns: {
            pin: 'Fesselung',
            skewer: 'Spieß',
            fork: 'Gabel',
            discoveredCheck: 'Abzugsschach',
            doubleAttack: 'Doppelangriff',
            overloading: 'Überlastung',
            backRankWeakness: 'Grundreihenschwäche',
            trappedPiece: 'Gefangene Figur',
        },
        practice: {
            title: 'Taktiktraining',
            hint: 'Hinweis',
            makeYourMove: 'Mache deinen Zug auf dem Brett',
            correct: 'Richtig! Gut gemacht!',
            incorrect: 'Nicht ganz. Versuch es nochmal!',
            tryAgain: 'Nochmal versuchen',
            nextExercise: 'Nächste Übung',
            backToLearning: 'Zurück zum Lernbereich',
            findTheMove: 'Finde den Zug, der eine',
        },
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
        clearAllData: 'Effacer toutes les données',
        clearAllDataConfirm: 'Êtes-vous sûr de vouloir effacer toutes les données ? Cela supprimera toutes les parties sauvegardées, les paramètres et les noms d\'utilisateur. Cette action est irréversible.',
        clearAllDataDescription: 'Supprimer toutes les parties sauvegardées, les paramètres et les données en cache de votre navigateur.',
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
        startGame: 'Démarrer la partie',
        resumeGame: 'Reprendre la partie précédente',
        startNewGame: 'Démarrer une nouvelle partie',
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
        analyzeGame: 'Analyser une partie',
        learningArea: 'Zone d\'apprentissage',
        savedGamesTitle: 'Parties inachevées',
        savedGamesEmpty: 'Aucune partie en cours.',
        opponentLabel: 'Adversaire',
        evaluationLabel: 'Évaluation',
        noEvaluation: 'Pas d\'évaluation',
        deleteGame: 'Supprimer la partie',
        analyzeThisGame: 'Analyser cette partie',
    },
    game: {
        playingAs: 'Jouant',
        vs: 'contre',
        backToMenu: '← Retour au menu',
        stockfishStrength: 'Force de Stockfish',
        depth: 'Profondeur',
        undoMove: 'Annuler le dernier coup',
        resign: 'Abandonner',
        resignConfirm: 'Êtes-vous sûr de vouloir abandonner ? Cette action est irréversible.',
        resignation: 'Vous avez abandonné.',
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
        playFromHere: 'Jouer depuis cette position',
        playDescription: 'Choisissez un personnage, une couleur et la force du moteur pour continuer depuis ce coup.',
        chooseOpponent: 'Choisir votre adversaire',
        chooseSide: 'Choisissez votre couleur',
        chooseStrength: 'Force de l’adversaire',
        startPlay: 'Commencer ici',
        modeTitle: 'Analyser une partie existante',
        modeDescription: 'Importez un PGN ou un FEN et laissez le coach commenter chaque coup avec l’aide du moteur.',
        pasteLabel: 'Saisie PGN ou FEN',
        pastePlaceholder: 'Collez ici un PGN ou un FEN pour revoir la partie coup par coup...',
        chooseCoach: 'Choisir la personnalité du coach',
        orientation: 'Orientation de l’échiquier',
        startButton: 'Lancer l’analyse',
        next: 'Coup suivant',
        previous: 'Coup précédent',
        step: 'Coup',
        missedTactics: 'Tactiques manquées',
        cpLoss: 'Changement d’évaluation',
        none: 'Aucune détectée',
        opening: 'Ouverture',
        enginePending: 'Évaluation du moteur en cours...',
        coachPending: 'Le coach prépare son retour...',
        importError: 'Impossible de charger ce PGN ou FEN. Merci de vérifier la notation.',
        loadNewGame: 'Charger nouvelle partie',
        openingsExplorer: 'Explorateur d\'ouvertures',
        generatingExplanation: 'Génération de l\'explication...',
        noApiKey: 'Veuillez ajouter une clé API dans les paramètres.',
        askFollowUp: 'Posez une question sur cette ouverture...',
        possibleOpenings: 'ouvertures possibles',
        downloadGame: 'Télécharger la partie',
        downloadPGN: 'Télécharger en PGN',
        downloadFEN: 'Télécharger la position actuelle (FEN)',
        downloadTitle: 'Exporter la partie',
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
    learning: {
        title: 'Zone d\'apprentissage',
        subtitle: 'Pratiquez les motifs tactiques et les ouvertures',
        tacticalPatterns: 'Motifs tactiques',
        openings: 'Ouvertures',
        comingSoon: 'Bientôt disponible',
        backToMenu: 'Retour au menu',
        patterns: {
            pin: 'Clouage',
            skewer: 'Enfilade',
            fork: 'Fourchette',
            discoveredCheck: 'Échec à la découverte',
            doubleAttack: 'Double attaque',
            overloading: 'Surcharge',
            backRankWeakness: 'Faiblesse de la dernière rangée',
            trappedPiece: 'Pièce piégée',
        },
        practice: {
            title: 'Pratique tactique',
            hint: 'Indice',
            makeYourMove: 'Faites votre coup sur l\'échiquier',
            correct: 'Correct ! Bien joué !',
            incorrect: 'Pas tout à fait. Réessayez !',
            tryAgain: 'Réessayer',
            nextExercise: 'Exercice suivant',
            backToLearning: 'Retour à la zone d\'apprentissage',
            findTheMove: 'Trouvez le coup qui crée un',
        },
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
        clearAllData: 'Cancella tutti i dati',
        clearAllDataConfirm: 'Sei sicuro di voler cancellare tutti i dati? Questo eliminerà tutte le partite salvate, le impostazioni e i nomi utente. Questa azione non può essere annullata.',
        clearAllDataDescription: 'Rimuovi tutte le partite salvate, le impostazioni e i dati memorizzati dal tuo browser.',
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
        startGame: 'Inizia partita',
        resumeGame: 'Riprendi partita precedente',
        startNewGame: 'Inizia nuova partita',
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
        analyzeGame: 'Analizza una partita',
        learningArea: 'Area di apprendimento',
        savedGamesTitle: 'Partite non finite',
        savedGamesEmpty: 'Nessuna partita in corso.',
        opponentLabel: 'Avversario',
        evaluationLabel: 'Valutazione',
        noEvaluation: 'Nessuna valutazione',
        deleteGame: 'Elimina partita',
        analyzeThisGame: 'Analizza questa partita',
    },
    game: {
        playingAs: 'Giocando',
        vs: 'contro',
        backToMenu: '← Torna al menu',
        stockfishStrength: 'Forza di Stockfish',
        depth: 'Profondità',
        undoMove: 'Annulla ultima mossa',
        resign: 'Abbandona',
        resignConfirm: 'Sei sicuro di voler abbandonare? Questa azione non può essere annullata.',
        resignation: 'Hai abbandonato.',
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
        playFromHere: 'Gioca da questa posizione',
        playDescription: 'Scegli personaggio, colore e forza del motore per continuare da questa mossa.',
        chooseOpponent: 'Scegli l’avversario',
        chooseSide: 'Scegli il tuo colore',
        chooseStrength: 'Forza dell’avversario',
        startPlay: 'Inizia da qui',
        modeTitle: 'Analizza una partita esistente',
        modeDescription: 'Carica un PGN o un FEN e lascia che il coach commenti ogni mossa con il supporto del motore.',
        pasteLabel: 'Input PGN o FEN',
        pastePlaceholder: 'Incolla qui PGN o FEN per rivedere la partita mossa per mossa...',
        chooseCoach: 'Scegli la personalità del coach',
        orientation: 'Orientamento della scacchiera',
        startButton: 'Avvia analisi',
        next: 'Mossa successiva',
        previous: 'Mossa precedente',
        step: 'Mossa',
        missedTactics: 'Tattiche mancate',
        cpLoss: 'Variazione di valutazione',
        none: 'Nessuna rilevata',
        opening: 'Apertura',
        enginePending: 'Valutazione del motore in corso...',
        coachPending: 'Il coach sta preparando il feedback...',
        importError: 'Impossibile caricare questo PGN o FEN. Controlla la notazione.',
        loadNewGame: 'Carica nuova partita',
        openingsExplorer: 'Esplora aperture',
        generatingExplanation: 'Generazione spiegazione...',
        noApiKey: 'Aggiungi una chiave API nelle impostazioni.',
        askFollowUp: 'Fai una domanda su questa apertura...',
        possibleOpenings: 'aperture possibili',
        downloadGame: 'Scarica partita',
        downloadPGN: 'Scarica come PGN',
        downloadFEN: 'Scarica posizione attuale (FEN)',
        downloadTitle: 'Esporta partita',
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
    learning: {
        title: 'Area di apprendimento',
        subtitle: 'Pratica schemi tattici e aperture',
        tacticalPatterns: 'Schemi tattici',
        openings: 'Aperture',
        comingSoon: 'Prossimamente',
        backToMenu: 'Torna al menu',
        patterns: {
            pin: 'Inchiodatura',
            skewer: 'Infilata',
            fork: 'Forchetta',
            discoveredCheck: 'Scacco di scoperta',
            doubleAttack: 'Doppio attacco',
            overloading: 'Sovraccarico',
            backRankWeakness: 'Debolezza dell\'ultima traversa',
            trappedPiece: 'Pezzo intrappolato',
        },
        practice: {
            title: 'Pratica tattica',
            hint: 'Suggerimento',
            makeYourMove: 'Fai la tua mossa sulla scacchiera',
            correct: 'Corretto! Ben fatto!',
            incorrect: 'Non proprio. Riprova!',
            tryAgain: 'Riprova',
            nextExercise: 'Prossimo esercizio',
            backToLearning: 'Torna all\'area di apprendimento',
            findTheMove: 'Trova la mossa che crea un',
        },
    },
};

const pl: Translations = {
    common: {
        close: 'Zamknij',
        cancel: 'Anuluj',
        confirm: 'Potwierdź',
        loading: 'Ładowanie...',
        error: 'Błąd',
        save: 'Zapisz',
        clearAllData: 'Wyczyść wszystkie dane',
        clearAllDataConfirm: 'Czy na pewno chcesz wyczyścić wszystkie dane? Spowoduje to usunięcie wszystkich zapisanych gier, ustawień i nazw użytkowników. Ta akcja jest nieodwracalna.',
        clearAllDataDescription: 'Usuń wszystkie zapisane gry, ustawienia i dane z pamięci podręcznej przeglądarki.',
    },
    header: {
        tagline: 'z Gemini i Stockfish',
        buyMeABeer: 'Postaw mi piwo',
        github: 'GitHub',
    },
    start: {
        title: 'Chess Tutor AI',
        settings: '1. Ustawienia',
        language: 'Język',
        apiKey: 'Klucz API Google Gemini',
        apiKeyPlaceholder: 'AIzaSy...',
        getApiKey: 'Zdobądź darmowy klucz',
        startGame: 'Rozpocznij grę',
        resumeGame: 'Wznów poprzednią partię',
        startNewGame: 'Rozpocznij nową partię',
        chooseCoach: 'Wybierz swojego trenera:',
        importPosition: 'Importuj pozycję lub partię (FEN lub PGN)',
        importPositionPlaceholder: 'Wklej tutaj pozycję FEN lub partię PGN...',
        formatDetected: 'Wykryto format:',
        formatFen: 'Pozycja FEN',
        formatPgn: 'Partia PGN',
        formatInvalid: 'Nieprawidłowy format - wklej poprawny FEN lub PGN',
        apiKeyRequired: 'Podaj prawidłowy klucz API, aby kontynuować.',
        colorSelection: 'Wybierz kolor:',
        playAsWhite: 'Graj białymi',
        playAsBlack: 'Graj czarnymi',
        randomColor: 'Losowo',
        analyzeGame: 'Analizuj partię',
        learningArea: 'Strefa nauki',
        savedGamesTitle: 'Niedokończone partie',
        savedGamesEmpty: 'Brak niedokończonych partii.',
        opponentLabel: 'Przeciwnik',
        evaluationLabel: 'Ocena',
        noEvaluation: 'Brak oceny',
        deleteGame: 'Usuń partię',
        analyzeThisGame: 'Analizuj tę partię',
    },
    game: {
        playingAs: 'Grasz jako',
        vs: 'przeciw',
        backToMenu: '← Powrót do menu',
        stockfishStrength: 'Siła Stockfish',
        depth: 'Głębokość',
        undoMove: 'Cofnij ruch',
        resign: 'Poddaj partię',
        resignConfirm: 'Czy na pewno chcesz się poddać? Tej akcji nie można cofnąć.',
        resignation: 'Poddano partię.',
        gameHistory: 'Historia partii',
        analyze: 'Analizuj',
        noMovesYet: 'Brak ruchów.',
        white: 'Białe',
        black: 'Czarne',
    },
    tutor: {
        aiCoach: 'Trener AI',
        askCoach: 'Zapytaj trenera...',
        hint: 'Podpowiedź',
        bestMove: 'Najlepszy ruch',
    },
    gameOver: {
        title: 'Koniec gry',
        checkmate: 'Mat!',
        youWon: 'Wygrana!',
        youLost: 'Przegrałeś.',
        draw: 'Remis!',
        stalemate: 'Pat!',
        mistakes: 'Twoje błędy',
        aiSummary: 'Podsumowanie AI',
        move: 'Ruch',
        evalBefore: 'Ocena przed',
        evalAfter: 'Ocena po',
        bestMove: 'Najlepszy ruch',
        newGame: 'Nowa partia',
    },
    analysis: {
        title: 'Analiza pozycji',
        currentPosition: 'Aktualna pozycja',
        evaluation: 'Ocena',
        bestMove: 'Najlepszy ruch',
        aiAnalysis: 'Analiza AI',
        playFromHere: 'Graj od tej pozycji',
        playDescription: 'Wybierz charakter, kolor i siłę silnika, aby grać od bieżącego ruchu.',
        chooseOpponent: 'Wybierz przeciwnika',
        chooseSide: 'Wybierz kolor',
        chooseStrength: 'Siła przeciwnika',
        startPlay: 'Graj odtąd',
        modeTitle: 'Analizuj istniejącą partię',
        modeDescription: 'Prześlij PGN lub FEN, aby coach przeprowadził Cię przez partię z pomocą silnika.',
        pasteLabel: 'Wejście PGN lub FEN',
        pastePlaceholder: 'Wklej PGN lub FEN, aby przeglądać partię ruch po ruchu...',
        chooseCoach: 'Wybierz osobowość trenera',
        orientation: 'Orientacja szachownicy',
        startButton: 'Rozpocznij analizę',
        next: 'Następny ruch',
        previous: 'Poprzedni ruch',
        step: 'Ruch',
        missedTactics: 'Przegapione taktyki',
        cpLoss: 'Zmiana oceny',
        none: 'Brak',
        opening: 'Otwarcie',
        enginePending: 'Ocena silnika w toku...',
        coachPending: 'Trener przygotowuje opinię...',
        importError: 'Nie udało się wczytać PGN ani FEN. Sprawdź zapis.',
        loadNewGame: 'Załaduj nową partię',
        openingsExplorer: 'Eksplorator otwarć',
        generatingExplanation: 'Generowanie wyjaśnienia...',
        noApiKey: 'Dodaj klucz API w ustawieniach.',
        askFollowUp: 'Zadaj pytanie uzupełniające o to otwarcie...',
        possibleOpenings: 'możliwe otwarcia',
        downloadGame: 'Pobierz grę',
        downloadPGN: 'Pobierz jako PGN',
        downloadFEN: 'Pobierz aktualną pozycję (FEN)',
        downloadTitle: 'Eksportuj grę',
    },
    apiKeyInput: {
        title: 'Wymagany klucz API',
        description: 'Podaj swój klucz Google Gemini, aby kontynuować.',
        placeholder: 'Wprowadź klucz API...',
        submit: 'Wyślij',
        getKey: 'Zdobądź darmowy klucz API',
    },
    onboarding: {
        welcome: {
            title: 'Chess Tutor AI',
            subtitle: 'Twój osobisty trener szachowy.',
            claim: 'Graj, ucz się i analizuj z pomocą Gemini i Stockfish.',
        },
        language: {
            title: 'Wybierz język',
            description: 'Dostosujemy doświadczenie i wiadomości do wybranego języka.',
        },
        value: {
            title: 'Twoje korzyści',
            bullets: [
                'Trenuj z osobowościami dopasowanymi do twojego stylu.',
                'Importuj FEN lub PGN i otrzymuj wskazówki na żywo podczas analizy.',
                'Połącz kreatywność Google Gemini z precyzją Stockfish.',
                'Zapisuj postęp lokalnie — wróć do gry w dowolnym momencie.',
            ],
        },
        api: {
            title: 'Dodaj swój klucz API LLM',
            description: 'Potrzebujemy twojego klucza Gemini, aby generować ruchy i objaśnienia.',
            inputLabel: 'Klucz API Google Gemini',
            placeholder: 'AIzaSy...',
            storage: 'Twój klucz jest przechowywany w przeglądarce i nigdy nie jest udostępniany.',
            serverUse: 'Wysyłamy go na nasz serwer tylko podczas wykonywania zapytań i nigdy go nie logujemy.',
            costNote: 'Tokeny LLM są rozliczane przez Google, więc masz kontrolę nad zużyciem.',
            privacy: 'Nigdy nie używamy twojego klucza do niczego poza tym trenerem.',
            getKey: 'Zdobądź darmowy klucz Gemini',
        },
        actions: {
            next: 'Dalej',
            back: 'Wstecz',
            finish: 'Zapisz i zacznij grać',
        },
        stepIndicator: (step: number, total: number) => `Krok ${step} z ${total}`,
    },
    learning: {
        title: 'Strefa nauki',
        subtitle: 'Ćwicz wzorce taktyczne i otwarcia',
        tacticalPatterns: 'Wzorce taktyczne',
        openings: 'Otwarcia',
        comingSoon: 'Wkrótce',
        backToMenu: 'Powrót do menu',
        patterns: {
            pin: 'Związanie',
            skewer: 'Szpikulec',
            fork: 'Widły',
            discoveredCheck: 'Szach z odkrycia',
            doubleAttack: 'Podwójny atak',
            overloading: 'Przeciążenie',
            backRankWeakness: 'Słabość ostatniej linii',
            trappedPiece: 'Uwięziona figura',
        },
        practice: {
            title: 'Trening taktyczny',
            hint: 'Podpowiedź',
            makeYourMove: 'Wykonaj ruch na szachownicy',
            correct: 'Poprawnie! Dobra robota!',
            incorrect: 'Nie do końca. Spróbuj ponownie!',
            tryAgain: 'Spróbuj ponownie',
            nextExercise: 'Następne ćwiczenie',
            backToLearning: 'Powrót do strefy nauki',
            findTheMove: 'Znajdź ruch, który tworzy',
        },
    },
};

export const translations: Record<SupportedLanguage, Translations> = {
    en,
    de,
    fr,
    it,
    pl,
};
