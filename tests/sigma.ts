import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Sigma } from "../target/types/sigma";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import assert from "assert";

describe("sigma", () => {
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Sigma as Program<Sigma>;

  const counter = anchor.web3.Keypair.generate();
  let whitelist: anchor.web3.PublicKey = null;
  let whitelistBump: number = null;

  let user1 = anchor.web3.Keypair.generate();
  let user2 = anchor.web3.Keypair.generate();
  // user3 is provider.wallet

  let attacker = anchor.web3.Keypair.generate();

  const tree = new MerkleTree(
    [
      user1.publicKey.toBuffer(),
      user2.publicKey.toBuffer(),
      provider.wallet.publicKey.toBuffer(),
    ],
    keccak256,
    { sortPairs: true, hashLeaves: true }
  );
  const root = tree.getRoot();

  it("Initialize", async () => {
    [whitelist, whitelistBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("whitelist"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.rpc.initialize(whitelistBump, [...root], {
        accounts: {
          whitelist: whitelist,
          counter: counter.publicKey,
          payer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [counter],
      });
    } catch (e) {
      assert.fail("Initialization failed.");
    }
  });

  it("valid increment", async () => {
    const leaf = keccak256(user1.publicKey.toBuffer());
    const proof = tree.getProof(leaf);

    const validProof: Buffer[] = proof.map((p) => p.data);

    await program.rpc.increment(validProof, {
      accounts: {
        whitelist: whitelist,
        counter: counter.publicKey,
        payer: user1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [user1],
    });

    const counterInfo = await program.account.counter.fetch(counter.publicKey);
    assert.equal(counterInfo.count, 1);
  });

  it("Invalid Increment", async () => {
    const leaf = keccak256(attacker.publicKey.toBuffer());
    const proof = tree.getProof(leaf);

    const validProof: Buffer[] = proof.map((p) => p.data);

    try {
      await program.rpc.increment(validProof, {
        accounts: {
          whitelist: whitelist,
          counter: counter.publicKey,
          payer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      });
      assert.fail("attacker shouldn't be able to increment!");
    } catch (e) {
      assert.equal(e.code, 6000);
    }
  });
});
