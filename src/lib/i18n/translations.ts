export type SupportedLanguage = 'en' | 'de' | 'fr' | 'it';

export interface Translations {
    // Common
    common: {
        close: string;
        cancel: string;
        confirm: string;
        loading: string;
        error: string;
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
}

const en: Translations = {
    common: {
        close: 'Close',
        cancel: 'Cancel',
        confirm: 'Confirm',
        loading: 'Loading...',
        error: 'Error',
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
        importPosition: 'Import Position (Optional FEN)',
        importPositionPlaceholder: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
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
};

const de: Translations = {
    common: {
        close: 'Schließen',
        cancel: 'Abbrechen',
        confirm: 'Bestätigen',
        loading: 'Lädt...',
        error: 'Fehler',
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
        importPosition: 'Position importieren (Optional FEN)',
        importPositionPlaceholder: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
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
};

const fr: Translations = {
    common: {
        close: 'Fermer',
        cancel: 'Annuler',
        confirm: 'Confirmer',
        loading: 'Chargement...',
        error: 'Erreur',
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
        importPosition: 'Importer une position (FEN optionnel)',
        importPositionPlaceholder: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
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
};

const it: Translations = {
    common: {
        close: 'Chiudi',
        cancel: 'Annulla',
        confirm: 'Conferma',
        loading: 'Caricamento...',
        error: 'Errore',
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
        importPosition: 'Importa posizione (FEN opzionale)',
        importPositionPlaceholder: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
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
};

export const translations: Record<SupportedLanguage, Translations> = {
    en,
    de,
    fr,
    it,
};
