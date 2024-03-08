# Demarket SmartContract

The **Demarket SmartContract** is a smart contract that binds NFT buying and selling transactions on the NFT demarket exchange

![snapedit_1695973681512](https://github.com/sonson0910/Demarket-Contract/assets/91943651/cd600320-99eb-49c0-96d2-0b20e6d5cf67)

## The main task of smart contracts
* Protecting the interests of buyers and sellers: We protect the interests of buyers and sellers by checking the output of the transaction that the buyer initiates, specifically, we will check the amount of the buyer sent to the seller must be greater than or equal to the amount set by the seller and must be sent to the correct address of the seller, otherwise the transaction will be refused.

``` rust
let output_seller = find_output(outputs, datum.price, from_verification_key(datum.seller))

pub fn find_output(outputs: List<Output>, price: Int, address: Address) -> Option<Output>{
  list.find(outputs, 
    fn(output) {
      check_amount(output, price) &&
      check_address(output, address)
    }
  )
}
```

* Protecting the rights of the author: For each transaction, the author will receive a royalty from that transaction, and the seller will be the one to pay, that amount is attached to the asset when they lock it up contract. We will also check whether the royalty amount is enough or not, and will check whether the sending address belongs to the author or not.

``` rust
let output_author = find_output(outputs, datum.royalties, from_verification_key(datum.author))

pub fn find_output(outputs: List<Output>, price: Int, address: Address) -> Option<Output>{
  list.find(outputs, 
    fn(output) {
      check_amount(output, price) &&
      check_address(output, address)
    }
  )
}
```

* Check exchange fees: Like the author, each transaction on our exchange will collect a certain fee and will check its output. If this is not met, the transaction will be rejected. This fee will also be paid by the seller, will be attached to the property and locked into the contract.

``` rust
let output_demarket = find_output(outputs, demarket_fee, demarket_addr())

pub fn find_output(outputs: List<Output>, price: Int, address: Address) -> Option<Output>{
  list.find(outputs, 
    fn(output) {
      check_amount(output, price) &&
      check_address(output, address)
    }
  )
}
```

* Return assets to the seller: The smart contract will return assets to the seller if their signature matches the signature they attached to the contract.

``` rust
let seller_sign = must_be_signed_by(transaction, datum.seller)
...
when seller_sign is {
...
}

```

* Check if the buyer is the author: We have a plan to solve this problem, specifically we will check the output to see if the quantity of output meets the conditions.

``` rust
// Check if the author is the seller
if datum.seller == datum.author {

  // Find outputs that satisfy the seller's address and the amount must be greater than the royalty amount
  let list_out = filter(outputs, 
    
    // The output is taken from the outputs contained in the transaction
    fn(output) { 
      check_address(output, from_verification_key(datum.seller)) && 
      check_amount(output, datum.royalties) 
    }
  )
  
  // If more than 2 outputs exist, check again
  if length(list_out) >= 2 {
    
    // Look for deals that satisfy the full amount the seller lists for their product
    let list_seller = filter(list_out, 

      // The outputs are taken from the filtered outputs in the list_out variable above
      fn(output) { 
        check_amount(output, datum.price) 
      }
    )

    // The contract will be accepted if the number of outputs sent to the seller checked in the list_seller variable is greater than or equal to one, otherwise the contract will reject the transaction.
    length(list_seller) >= 1

  }else{
    
    // If the output number satisfying the amount transferred to the author (in the case of seller and author) is less than 2, the transaction will be rejected
    False
  }
}else{

  // If the buyer is not the seller and satisfies the above outputs, the transaction will be accepted
  True
}
```

* Check the purpose of the transaction: Before going into the logic of the contract, we will check what the purpose of this transaction is, if it is `Spend`, the contract will go into the logic below, if not Translation will be rejected

## Installation Instructions
### First, please clone this source code 
`git clone https://github.com/sonson0910/Demarket-Contract.git`
### If you haven't installed **deno** yet, install it
* Windows 
`irm https://deno.land/install.ps1 | iex`
* Ubuntu
`curl -fsSL https://deno.land/install.sh | sh`
* MacOS
`curl -fsSL https://deno.land/install.sh | sh`
### Install Aiken
* You can see installation instructions here: https://aiken-lang.org/installation-instructions
### Mint NFT as a test transaction
* In our test wallet, the `owner.seed` file already has ada and NFT inside. Additionally, you can mint additional NFT at: `https://demarket.vn/mint` and transfer it to `owner.seed` wallet
### Rename the parameters in the SellNFT.ts or SellNFTmore.ts file
* You can change the value of some fields such as price, author wallet address, etc. But you must be careful to change the value of the policyID field and AssetName field of the NFT you just minted.
### Run a test of locking an NFT onto a contract
* Please run the command  
`deno run --allow-net --allow-read --allow-env SellNFT.ts`
### Rename the parameters in the BuyerNFT.ts or BuyerNFTmore.ts file
* You must be careful to change the value of the policyID field and AssetName field, the price fields of the NFT you just locked into the contract.
### Run an NFT purchase test
* Please run the command  
`deno run --allow-net --allow-read --allow-env BuyerNFT.ts`
### Rename the parameters in the Refund.ts file
* You must be careful to change the value of the policyID field and AssetName field of the NFT you just locked into the contract to get the NFT back to your wallet
* **Note** that it can only be done when you have not yet taken the action of purchasing the NFT.
### Run a test to get your assets back to your wallet from the contract
* Please run the command   
`deno run --allow-net --allow-read --allow-env Refund.ts.ts`

## Prevent security holes:
* DEMARKET's smart contract was designed and after going through the development stages, our contract's safety has been greatly improved, bad guys cannot take away assets on the contract without without having to pay, we are very tightly bound on the outputs in the contract, from exchange fees, copyright fees to seller fees.

## Features: Our contract allows users to securely execute the following functions:
* Check the money output for the seller
* Check the money output for the author
* Check the money output for the exchange
* Check the seller's signature before returning the property to the seller
* Check the case if the author is the seller

## License

The **Demarket SmartContract** is released under the Apache2 License. See the `LICENSE` file for more details.

## Contact

For any questions or feedback, please contact the project maintainer at `sonlearn155@gmail.com`.
