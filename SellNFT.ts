import {
    Blockfrost,
    C,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
    Wallet,
} from "https://deno.land/x/lucid@0.8.4/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "previewad7caqvYiu70SZAKSYQKg3EE9WsIrcF3",
    ),
    "Preview",
);

// const wallet = lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./owner.sk"));
const wallet = lucid.selectWalletFromSeed(await Deno.readTextFile("./owner.seed"));

const validator = await readValidator();

async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}

const ownerPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).paymentCredential.hash;

const authorPublicKeyHash =
    lucid.utils.getAddressDetails("addr_test1vqhs6zag6mfkr8qj8l59sh5mfx7g0ay6hc8qfza6y8mzp9c3henpx")
        .paymentCredential.hash;

// const beneficiaryPublicKeyHash =
//     lucid.utils.getAddressDetails("addr_test1qqcxrwktpurgvrqt28xr5ha039j7ga59x33wp0r8dzkt4zysckcur8c2yu2975qwvtcg3gn73rf3v5e3wz0yaffkx7use04tnu")
//         .paymentCredential.hash;
// --------------------------------------------------------------------------


const Datum = Data.Object({
    policyId: Data.String,
    assetName: Data.String,
    seller: Data.String, 
    // buyer: Data.String,
    author: Data.String,
    price: Data.BigInt,
    royalties: Data.BigInt,
});

type Datum = Data.Static<typeof Datum>;

const Price = 100000000n;
const royalties = BigInt(parseInt(Price) * 1 / 100);

const policyId = "895d03411c0094facf70330f35cddeedf177165377e480ce307c12ae";
const assetName = "000de1404e4654203134";

const datum = Data.to<Datum>(
    {
        policyId: policyId,
        assetName: assetName,
        seller: ownerPublicKeyHash, // our own wallet verification key hash
        // buyer: beneficiaryPublicKeyHash,
        author: authorPublicKeyHash,
        price: Price,
        royalties: royalties,
    },
    Datum
);

const NFT = policyId + assetName;
console.log(NFT)

const txLock = await lock(NFT, { into: validator, datum: datum });

await lucid.awaitTx(txLock);

console.log(`NFT locked into the contract
    Tx ID: ${txLock}
    Datum: ${datum}
`);

// --- Supporting functions

async function lock(NFT, { into, datum }): Promise<TxHash> {
    const contractAddress = lucid.utils.validatorToAddress(into);
    console.log(contractAddress);
    const tx = await lucid
        .newTx()
        .payToContract(contractAddress, { inline: datum }, { [NFT]: 1n })
        .complete();

    const signedTx = await tx.sign().complete(); 

    return signedTx.submit(); 
}

