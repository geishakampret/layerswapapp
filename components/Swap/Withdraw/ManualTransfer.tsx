import { FC } from "react"
import useSWR from "swr"
import QRCode from "qrcode.react"
import colors from 'tailwindcss/colors';
import { ArrowLeftRight } from "lucide-react"
import Image from 'next/image';
import { ApiResponse } from "../../../Models/ApiResponse";
import { useSettingsState } from "../../../context/settings";
import { useSwapDataState } from "../../../context/swap";
import KnownInternalNames from "../../../lib/knownIds";
import BackgroundField from "../../backgroundField";
import LayerSwapApiClient, { DepositAddress, DepositAddressSource } from "../../../lib/layerSwapApiClient";

const ManualTransfer: FC = () => {
    const { layers, resolveImgSrc } = useSettingsState()
    const { swap } = useSwapDataState()
    const { source_network: source_network_internal_name, destination_network_asset } = swap
    const source_network = layers.find(n => n.internal_name === source_network_internal_name)
    const asset = source_network?.assets?.find(currency => currency?.asset === destination_network_asset)
    const layerswapApiClient = new LayerSwapApiClient()
    const { data: generatedDeposit } = useSWR<ApiResponse<DepositAddress>>(`/deposit_addresses/${source_network_internal_name}?source=${DepositAddressSource.UserGenerated}`, layerswapApiClient.fetcher)
    const generatedDepositAddress = generatedDeposit?.data?.address

    return <div className='rounded-md bg-secondary-700 border border-secondary-500 divide-y divide-secondary-500'>
        <div className={`w-full relative rounded-md px-3 py-3 shadow-sm border-secondary-700 border bg-secondary-700 flex flex-col items-center justify-center gap-2`}>
            <div className='p-2 bg-white/30 bg-opacity-30 rounded-xl'>
                <div className='p-2 bg-white/70 bg-opacity-70 rounded-lg'>
                    <QRCode
                        className="p-2 bg-white rounded-md"
                        value={generatedDepositAddress}
                        size={120}
                        bgColor={colors.white}
                        fgColor="#000000"
                        level={"H"}
                    />
                </div>
            </div>
        </div>
        {
            (source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet || source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli) &&
            <BackgroundField header={'Send type'} withoutBorder>
                <div className='flex items-center space-x-2'>
                    <ArrowLeftRight className='h-4 w-4' />
                    <p>
                        To Another Loopring L2 Account
                    </p>
                </div>
            </BackgroundField>
        }
        <BackgroundField Copiable={true} toCopy={generatedDepositAddress} header={'Deposit Address'} withoutBorder>
            <div>
                {
                    generatedDepositAddress ?
                        <p className='break-all text-white'>
                            {generatedDepositAddress}
                        </p>
                        :
                        <div className='bg-gray-500 w-56 h-5 animate-pulse rounded-md' />
                }
                {
                    (source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet || source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli) &&
                    <div className='flex text-xs items-center px-2 py-1 mt-1 border-2 border-secondary-100 rounded border-dashed'>
                        <p>
                            You might get a warning that this is not an activated address. You can ignore it.
                        </p>
                    </div>
                }
            </div>
        </BackgroundField>
        {
            (source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli || source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet) &&
            <div className='flex space-x-4'>
                <BackgroundField header={'Address Type'} withoutBorder>
                    <p>
                        EOA Wallet
                    </p>
                </BackgroundField>
            </div>
        }
        <div className='flex divide-x divide-secondary-500'>
            <BackgroundField Copiable={true} toCopy={swap?.requested_amount} header={'Amount'} withoutBorder>
                <p>
                    {swap?.requested_amount}
                </p>
            </BackgroundField>
            <BackgroundField header={'Asset'} withoutBorder>
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-5 w-5 relative">
                        {
                            asset &&
                            <Image
                                src={resolveImgSrc({ asset: asset?.asset })}
                                alt="From Logo"
                                height="60"
                                width="60"
                                className="rounded-md object-contain"
                            />
                        }
                    </div>
                    <div className="mx-1 block">{asset?.asset}</div>
                </div>
            </BackgroundField>
        </div>
    </div>
}

export default ManualTransfer