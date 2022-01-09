use anchor_lang::prelude::*;

pub mod merkle_proof;

declare_id!("HeVBDgyLTeCosZ7jAwoHsLLFbRHnDnRos4c4M84gf9AD");

#[program]
pub mod sigma {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, whitelist_bump: u8, root: [u8; 32]) -> ProgramResult {
        let whitelist = &mut ctx.accounts.whitelist;

        whitelist.base = ctx.accounts.payer.key();
        whitelist.root = root;
        whitelist.bump = whitelist_bump;

        let counter = &mut ctx.accounts.counter;
        counter.count = 0;

        Ok(())
    }

    pub fn increment(ctx: Context<Increment>, proof: Vec<[u8; 32]>) -> ProgramResult {
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
#[instruction(whitelist_bump: u8, _root: [u8; 32])]
pub struct Initialize<'info> {
    /// Whitelist account that stores the root hash
    #[account(
        init,
        seeds = [
            b"whitelist".as_ref(),
            payer.key().as_ref()
        ],
        bump = whitelist_bump,
        payer = payer
    )]
    pub whitelist: Account<'info, Whitelist>,

    /// Counter account
    #[account(
        init,
        seeds = [
            b"counter".as_ref(),
            payer.key().as_ref()
        ],
        bump = whitelist_bump,
        payer = payer
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
    #[account(mut)]
    pub whitelist: Account<'info, Whitelist>,

    /// Counter account
    #[account(mut)]
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
    pub bump: u8,
    pub root: [u8; 32],
}

#[account]
#[derive(Default)]
pub struct Counter {
    pub count: u64,
}

#[error]
pub enum ErrorCode {
    #[msg("Invalid Merkle proof.")]
    InvalidProof,
}
