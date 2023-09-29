import {
    Blockfrost,
    C,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
} from "https://deno.land/x/lucid@0.8.3/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "previewad7caqvYiu70SZAKSYQKg3EE9WsIrcF3",
    ),
    "Preview",
);

lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./owner.sk"));

const beneficiaryPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).paymentCredential.hash;

const validator = await readValidator();

// --- Supporting functions

async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}

// ---------------------------------------------------

const scriptAddress = lucid.utils.validatorToAddress(validator);

// we get all the UTXOs sitting at the script address
const scriptUtxos = await lucid.utxosAt(scriptAddress);

const Datum = Data.Object({
    policyId: Data.String,
    assetName: Data.String,
    seller: Data.String,
    buyer: Data.String,
    price: Data.BigInt,
});

type Datum = Data.Static<typeof Datum>;

const policyId = "84bbdb23ad326e42ee70540ec8c33a5b433c2e1c54f8a0bea3c45ac0";
const assetName = "000de14061696b656e";


let UTOut;

const utxos = scriptUtxos.filter((utxo) => {
    // console.log(utxo);
    // const datum = Data.from<Datum>(utxo.datum, Datum);
    //   console.log(datum)
    try {
        const temp = Data.from<Datum>(utxo.datum, Datum);
        //   console.log(parseInt(datum.price))
        if (temp.policyId === policyId && temp.assetName === assetName) {
            UTOut = Data.from<Datum>(utxo.datum, Datum);
            // console.log(BigInt(datum.price))
            return true;
        }
        return false;
    } catch (e) {
        // console.log(e);
        return false;
    }
});

console.log(UTOut)

if (utxos.length === 0) {
    console.log("No redeemable utxo found. You need to wait a little longer...");
    Deno.exit(1);
}


// we don't have any redeemer in our contract but it needs to be empty
const redeemer = Data.empty();

const txUnlock = await unlock(utxos, UTOut, { from: validator, using: redeemer });
// console.log(1);

await lucid.awaitTx(txUnlock);

console.log(`NFT recovered from the contract
    Tx ID: ${txUnlock}
    Redeemer: ${redeemer}
`);


async function unlock(utxos, UTOut, { from, using }): Promise<TxHash> {
    console.log(BigInt(UTOut.price));
    const tx = await lucid
        .newTx()
        .collectFrom(utxos, using)
        .addSigner(await lucid.wallet.address())
        .attachSpendingValidator(from)
        .complete();
    // console.log(BigInt(UTOut.price));


    const signedTx = await tx
        .sign()
        .complete();

    return signedTx.submit();
}