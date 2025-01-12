import { ethers } from "ethers";
import {
  StakingOperation as StakingOperationModel,
  StakingOperationStatusEnum,
} from "../client/api";
import { Transaction } from "./transaction";
import { Coinbase } from "./coinbase";
import { delay } from "./utils";

/**
 * A representation of a staking operation (stake, unstake, claim rewards, etc). It
 * may have multiple steps with some being transactions to sign, and others to wait.
 */
export class StakingOperation {
  private model: StakingOperationModel;
  private transactions: Transaction[];

  /**
   * Creates a StakingOperation object.
   *
   * @class
   * @param model - The staking operation response from the API call.
   */
  constructor(model: StakingOperationModel) {
    if (!model) {
      throw new Error("Invalid model type");
    }
    this.model = model;
    this.transactions = [];

    if (model.transactions) {
      model.transactions.forEach(transaction => {
        this.transactions.push(new Transaction(transaction));
      });
    }
  }

  /**
   * Get the staking operation ID.
   *
   * @returns The unique ID of the staking operation.
   */
  public getID(): string {
    return this.model.id;
  }

  /**
   * Get the transactions associated with this staking operation.
   *
   * @returns The array of transactions.
   */
  public getTransactions(): Transaction[] {
    return this.transactions;
  }

  /**
   * Get signed voluntary exit messages for native eth unstaking
   *
   * @returns The signed voluntary exit messages for a native eth unstaking operation.
   */
  public getSignedVoluntaryExitMessages(): string[] {
    const signedVoluntaryExitMessages: string[] = [];

    if (this.model.metadata) {
      this.model.metadata.forEach(metadata => {
        const decodedSignedVoluntaryExitMessage = atob(metadata.signed_voluntary_exit);

        signedVoluntaryExitMessages.push(decodedSignedVoluntaryExitMessage);
      });
    }

    return signedVoluntaryExitMessages;
  }

  /**
   * Get the status of the staking operation.
   *
   * @returns The status of the staking operation.
   */
  public getStatus(): StakingOperationStatusEnum {
    return this.model.status;
  }

  /**
   * Returns whether the Staking operation is in a terminal State.
   *
   * @returns Whether the Staking operation is in a terminal State
   */
  isTerminalState(): boolean {
    return this.getStatus() === StakingOperationStatusEnum.Complete;
  }

  /**
   * Waits until the Staking Operation is completed or failed by polling its status at the given interval.
   *
   * @param options - The options to configure the wait function.
   * @param options.intervalSeconds - The interval at which to poll, in seconds
   * @param options.timeoutSeconds - The maximum amount of time to wait for the StakingOperation to complete, in seconds
   * @throws {Error} If the StakingOperation takes longer than the given timeout.
   * @returns The completed StakingOperation object.
   */
  public async wait({
    intervalSeconds = 5,
    timeoutSeconds = 3600,
  } = {}): Promise<StakingOperationModel> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutSeconds * 1000) {
      await this.fetch();
      if (this.isTerminalState()) {
        return this.model;
      }

      if (Date.now() - startTime > timeoutSeconds * 1000) {
        throw new Error("Staking operation timed out");
      }

      await delay(intervalSeconds);
    }

    throw new Error("Staking operation timed out");
  }

  /**
   * Get the staking operation for the given ID.
   *
   * @returns The staking operation object.
   */
  public async fetch(): Promise<StakingOperationModel> {
    const response = await Coinbase.apiClients.stake!.getExternalStakingOperation(
      this.model.network_id,
      this.model.address_id,
      this.model.id,
    );

    this.model = response.data;

    if (this.model.transactions) {
      this.model.transactions.forEach(transaction => {
        this.transactions.push(new Transaction(transaction));
      });
    }

    return this.model;
  }

  /**
   * Sign the transactions in the StakingOperation object.
   *
   * @param key - The key used to sign the transactions.
   */
  public async sign(key: ethers.Wallet): Promise<void> {
    for (const tx of this.transactions) {
      if (!tx.isSigned()) {
        await tx.sign(key);
      }
    }
  }
}
