import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Sigma } from "../target/types/sigma";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import assert from "assert";
import fs from "fs";
describe("sigma", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Sigma as Program<Sigma>;

  let user1 = anchor.web3.Keypair.generate()
  let user2 = anchor.web3.Keypair.generate()
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
      let [whitelist, whitelistBump] = await anchor.web3.PublicKey.findProgramAddress(
          [Buffer.from("whitelist")],
          program.programId
      );
      let [counter, counterBump] = await anchor.web3.PublicKey.findProgramAddress(
          [Buffer.from("counter")],
          program.programId
      );

      await program.rpc.initialize( [...root], {
          accounts: {
            whitelist: whitelist,
            counter,
            payer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          }
      });
    });

    it("valid increment", async () => {
     let [whitelist, whitelistBump] = await anchor.web3.PublicKey.findProgramAddress(
          [Buffer.from("whitelist")],
          program.programId
      );
      let [counter, counterBump] = await anchor.web3.PublicKey.findProgramAddress(
          [Buffer.from("counter")],
          program.programId
      );
      const leaf = keccak256(user1.publicKey.toBuffer());
      const proof = tree.getProof(leaf);
      const validProof: Buffer[] = proof.map((p) => p.data);

      await program.rpc.increment(validProof, {
        accounts: {
          whitelist: whitelist,
          counter: counter,
          payer: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [user1],
      });

    });

    it("invalid increment", async () => {
      let [whitelist, whitelistBump] = await anchor.web3.PublicKey.findProgramAddress(
          [Buffer.from("whitelist")],
          program.programId
      );
      let [counter, counterBump] = await anchor.web3.PublicKey.findProgramAddress(
          [Buffer.from("counter")],
          program.programId
      );
      const leaf = keccak256(attacker.publicKey.toBuffer());
      const proof = tree.getProof(leaf);
      const validProof: Buffer[] = proof.map((p) => p.data);

      await program.rpc.increment(validProof, {
        accounts: {
          whitelist: whitelist,
          counter: counter,
          payer: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [user1],
      })
    });
});
