import { render, screen } from "@testing-library/react";
import { EvaluationBar } from "./EvaluationBar";
import "@testing-library/jest-dom";

describe("EvaluationBar", () => {
    it("renders 0.0 for initial state", () => {
        render(<EvaluationBar score={0} />);
        expect(screen.getByText("0.0")).toBeInTheDocument();
    });

    it("renders positive score for white advantage", () => {
        render(<EvaluationBar score={150} />);
        expect(screen.getByText("+1.5")).toBeInTheDocument();
    });

    it("renders negative score for black advantage", () => {
        render(<EvaluationBar score={-230} />);
        expect(screen.getByText("-2.3")).toBeInTheDocument();
    });

    it("renders mate score", () => {
        render(<EvaluationBar mate={3} />);
        expect(screen.getByText("M3")).toBeInTheDocument();
    });

    it("renders negative mate score", () => {
        render(<EvaluationBar mate={-5} />);
        expect(screen.getByText("M5")).toBeInTheDocument();
    });
});
