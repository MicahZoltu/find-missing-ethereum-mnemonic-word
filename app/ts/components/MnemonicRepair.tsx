import { secp256k1 } from '@noble/curves/secp256k1'
import { keccak_256 } from '@noble/hashes/sha3'
import { useSignal } from '@preact/signals'
import { HDKey } from '@scure/bip32'
import { mnemonicToSeed, validateMnemonic } from '@zoltu/bip39'
import { wordlist } from '@zoltu/bip39/wordlists/english.js'
import { useState } from 'preact/hooks'
import { Resolved, useAsyncState } from '../library/preact-utilities.js'
import { sleep } from '../library/utilities.js'
import { Input } from './Input.js'

export function MnemonicRepair() {
	const elevenWordsInputValue = useSignal('')
	const addressInputValue = useSignal('')
	const { value, waitFor, reset } = useAsyncState<string>()
	const currentPosition = useSignal<number>(0)
	const currentWord = useSignal<string>('abandon')
	function onSearch() {
		waitFor(async () => {
			const elevenWords = elevenWordsInputValue.peek()
			const address = addressInputValue.peek()
			const split = elevenWords.split(' ')
			if (split.length !== 11) throw new Error(`Must enter 11 words, you entered ${split.length} words.`)
			split.forEach(word => {
				if (!wordlist.includes(word)) throw new Error(`All words must be part of a mnemonic.  ${word} is not part of the mnemonic word list.`)
			})
			if (!/0x[a-fA-F0-9]{40}/.test(address)) throw new Error(`Address must be an Ethereum address starting with 0x, you entered ${address}`)
			for (const positionToTest of [11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
				currentPosition.value = positionToTest
				for (const word of wordlist) {
					currentWord.value = word
					const splitCopy = [...split]
					splitCopy.splice(positionToTest, 0, word)
					const maybeMnemonic = splitCopy.join(' ')
					if (!validateMnemonic(maybeMnemonic, wordlist)) {
						await sleep(0)
						continue
					}
					const seed = await mnemonicToSeed(maybeMnemonic)
					const hdKey = HDKey.fromMasterSeed(seed)
					const derivedHdKey = hdKey.derive(`m/44'/60'/0'/0/0`)
					const maybePrivateKey = derivedHdKey.privateKey
					if (maybePrivateKey === null) {
						// TODO: figure out if this is actually possible
						throw new Error(`Unexected Error: Private Key missing from HDKey.`)
					}
					const publicKey = secp256k1.getPublicKey(maybePrivateKey, false)
					const addressBytes = keccak_256(publicKey.subarray(1, 65)).slice(12)
					const addressString = `0x${Array.from(addressBytes).map(x => x.toString(16).padStart(2, '0')).join('')}`
					if (addressString !== address) continue
					return word
				}
			}
			throw new Error(`No word found to complete mnemonic.`)
		})
	}

	const [WordsInput_] = useState(() => () => <Input style={{width:'500px'}} type='password' autocomplete='off' placeholder='zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo' value={elevenWordsInputValue}/>)
	const [AddressInput_] = useState(() => () => <Input style={{width:'500px'}} placeholder='0xfc2077ca7f403cbeca41b1b0f62d91b5ea631b5e' value={addressInputValue}/>)
	const [SearchButton_] = useState(() => () => <button onClick={onSearch}>Search</button>)
	const [Searching_] = useState(() => () => <>Trying position {currentPosition} with word {currentWord}</>)
	const [ResetButton_] = useState(() => () => <button onClick={reset} style={{ marginLeft: 'auto' }}>Reset</button>)
	const [Result_] = useState(() => ({foundWord}: {foundWord: Resolved<string>}) => <span>The <b>{currentPosition.value === 1 ? '1st' : currentPosition.value === 2 ? '2nd' : currentPosition.value === 3 ? '3rd' : `${currentPosition.value}th`}</b> word is <b><u>{foundWord.value}</u></b>!</span>)

	switch (value.value.state) {
		case 'inactive': return <><div style={{ flexDirection: 'column' }}>
			<label style={{ flexDirection: 'column'}}>Enter the 11 words you know<WordsInput_/></label>
			<label style={{ flexDirection: 'column'}}>Enter the address of the first account<AddressInput_/></label>
		</div><SearchButton_/></>
		case 'pending': return <Searching_/>
		case 'rejected': return <><span style={{ color: 'red' }}>{value.value.error.message}</span><ResetButton_/></>
		case 'resolved': return <Result_ foundWord={value.value}/>
	}
}
