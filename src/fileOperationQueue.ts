export class FileOperationQueue {
    private pending: Promise<void> = Promise.resolve()

    constructor(private readonly onError: (error: unknown) => void) {}

    run(operation: () => Promise<void>): Promise<void> {
        this.pending = this.pending.then(operation).catch(this.onError)
        return this.pending
    }
}
