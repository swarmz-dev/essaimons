/**
 * Store to manage proposition import/export state
 */

import type { ConflictReport, ImportConfiguration, ImportResult, ConflictResolution } from 'backend/types';

interface ImportState {
    step: 'upload' | 'resolve' | 'execute' | 'complete';
    conflictReport: ConflictReport | null;
    configuration: ImportConfiguration | null;
    result: ImportResult | null;
    isLoading: boolean;
    error: string | null;
}

class PropositionImportExportStore {
    private state = $state<ImportState>({
        step: 'upload',
        conflictReport: null,
        configuration: null,
        result: null,
        isLoading: false,
        error: null,
    });

    get currentState(): ImportState {
        return this.state;
    }

    get step(): ImportState['step'] {
        return this.state.step;
    }

    get conflictReport(): ConflictReport | null {
        return this.state.conflictReport;
    }

    get configuration(): ImportConfiguration | null {
        return this.state.configuration;
    }

    get result(): ImportResult | null {
        return this.state.result;
    }

    get isLoading(): boolean {
        return this.state.isLoading;
    }

    get error(): string | null {
        return this.state.error;
    }

    setStep(step: ImportState['step']): void {
        this.state.step = step;
    }

    setConflictReport(report: ConflictReport): void {
        this.state.conflictReport = report;
        this.state.configuration = {
            importId: report.importId,
            resolutions: [],
        };
    }

    addResolution(resolution: ConflictResolution): void {
        if (!this.state.configuration) {
            return;
        }

        // Replace existing resolution for the same conflict
        const existingIndex = this.state.configuration.resolutions.findIndex((r) => r.conflictIndex === resolution.conflictIndex);

        if (existingIndex >= 0) {
            this.state.configuration.resolutions[existingIndex] = resolution;
        } else {
            this.state.configuration.resolutions.push(resolution);
        }
    }

    removeResolution(conflictIndex: number): void {
        if (!this.state.configuration) {
            return;
        }

        this.state.configuration.resolutions = this.state.configuration.resolutions.filter((r) => r.conflictIndex !== conflictIndex);
    }

    setResult(result: ImportResult): void {
        this.state.result = result;
    }

    setLoading(isLoading: boolean): void {
        this.state.isLoading = isLoading;
    }

    setError(error: string | null): void {
        this.state.error = error;
    }

    reset(): void {
        this.state = {
            step: 'upload',
            conflictReport: null,
            configuration: null,
            result: null,
            isLoading: false,
            error: null,
        };
    }

    /**
     * Check if all critical conflicts are resolved
     */
    areAllCriticalConflictsResolved(): boolean {
        if (!this.state.conflictReport || !this.state.configuration) {
            return false;
        }

        const criticalConflicts = this.state.conflictReport.conflicts.filter((c) => c.severity === 'ERROR');

        for (const conflict of criticalConflicts) {
            const index = this.state.conflictReport.conflicts.indexOf(conflict);
            const hasResolution = this.state.configuration.resolutions.some((r) => r.conflictIndex === index);

            if (!hasResolution) {
                return false;
            }
        }

        return true;
    }

    /**
     * Count the number of resolved conflicts
     */
    getResolvedConflictsCount(): number {
        if (!this.state.configuration) {
            return 0;
        }

        return this.state.configuration.resolutions.length;
    }

    /**
     * Count the total number of conflicts
     */
    getTotalConflictsCount(): number {
        if (!this.state.conflictReport) {
            return 0;
        }

        return this.state.conflictReport.conflicts.length;
    }

    /**
     * Calculate how many propositions will be created
     */
    getWillCreateCount(): number {
        if (!this.state.configuration || !this.state.conflictReport) {
            return this.state.conflictReport?.summary.newPropositions ?? 0;
        }

        // Start with new propositions (those that don't have conflicts)
        let count = this.state.conflictReport.summary.newPropositions ?? 0;

        // Add DUPLICATE_PROPOSITION conflicts where user chose CREATE_NEW (create duplicate)
        for (const resolution of this.state.configuration.resolutions) {
            const conflict = this.state.conflictReport.conflicts[resolution.conflictIndex];

            if (conflict?.type === 'DUPLICATE_PROPOSITION' && resolution.strategy === 'CREATE_NEW') {
                count++;
            }
        }

        return count;
    }

    /**
     * Calculate how many propositions will be merged
     */
    getWillMergeCount(): number {
        if (!this.state.configuration || !this.state.conflictReport) {
            return 0;
        }

        let count = 0;

        // Count only DUPLICATE_PROPOSITION conflicts that will be merged
        for (const resolution of this.state.configuration.resolutions) {
            const conflict = this.state.conflictReport.conflicts[resolution.conflictIndex];

            // If it's a DUPLICATE_PROPOSITION and user chose MERGE, count it
            if (conflict?.type === 'DUPLICATE_PROPOSITION' && resolution.strategy === 'MERGE') {
                count++;
            }
        }

        return count;
    }
}

export const propositionImportExportStore = new PropositionImportExportStore();
