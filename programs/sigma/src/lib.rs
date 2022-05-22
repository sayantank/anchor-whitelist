use anchor_lang::prelude::*;
pub mod merkle_proof;
use std::mem::size_of;

declare_id!("651wt9EAWKaaxxLcmD9APKa8FuYZXhtgbds8DM4UGYRM");

#[program]
pub mod sigma {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>,  root: [u8; 32]) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;

        whitelist.base = ctx.accounts.payer.key();
        whitelist.root = root;
        let counter = &mut ctx.accounts.counter;
        counter.count = 0;

        Ok(())
    }

    pub fn increment(ctx: Context<Increment>, proof: Vec<[u8; 32]>) -> Result<()> {
        let user = &ctx.accounts.payer;
        let counter = &mut ctx.accounts.counter;
        let whitelist = &ctx.accounts.whitelist;

        // The hash of the data we're verifying for. It could be something like this,
        // let node = anchor_lang::solana_program::keccak::hashv(&[
        //     &index.to_le_bytes(),
        //     &claimant_account.key().to_bytes(),
        //     &amount.to_le_bytes(),
        // ]);

        let node = anchor_lang::solana_program::keccak::hash(user.key().as_ref());
        require!(merkle_proof::verify(proof, whitelist.root, node.0), InvalidProof);

        // Verification Successful
        counter.count += 1;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Whitelist account that stores the root hash
    #[account(
        init,
        seeds = [
            b"whitelist".as_ref()
        ],
        bump,
        space = 8 + size_of::< Whitelist > (),
        payer = payer
    )]
    pub whitelist: Account<'info, Whitelist>,

    /// Counter account
    #[account(
        init,
        seeds = [
            b"counter".as_ref()
        ],
        bump,
        payer = payer,
        space = 8 + size_of::< Counter > (),
    )]
    pub counter: Account<'info, Counter>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// The [System] program.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    /// Whitelist account that stores the root hash
    #[account(mut,seeds = [
    b"whitelist".as_ref()
    ],bump)]
    pub whitelist: Account<'info, Whitelist>,

    /// Counter account
    #[account(mut,seeds = [
    b"counter".as_ref()
    ],bump)]
    pub counter: Account<'info, Counter>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// The [System] program.
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct Whitelist {
    pub base: Pubkey,
    pub root: [u8; 32],
}

#[account]
#[derive(Default)]
pub struct Counter {
    pub count: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid Merkle proof.")]
    InvalidProof,
}
