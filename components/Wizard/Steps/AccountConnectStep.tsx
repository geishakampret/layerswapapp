import { FC, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { useQueryState } from '../../../context/query';
import { useSwapDataState } from '../../../context/swap';
import { useUserExchangeDataUpdate } from '../../../context/userExchange';
import { useDelayedInterval } from '../../../hooks/useInterval';
import { parseJwt } from '../../../lib/jwtParser';
import { OpenLink } from '../../../lib/openLink';
import TokenService from '../../../lib/TokenService';
import { SwapCreateStep } from '../../../Models/Wizard';
import SubmitButton from '../../buttons/submitButton';
import Carousel, { CarouselItem, CarouselRef } from '../../Carousel';

const AccountConnectStep: FC = () => {
    const { swapFormData } = useSwapDataState()
    const { exchange, amount, currency } = swapFormData || {}
    const { o_auth_authorization_url } = exchange?.baseObject || {}
    const { goToStep } = useFormWizardaUpdate()
    const { currentStepName } = useFormWizardState()
    const { getUserExchanges } = useUserExchangeDataUpdate()
    const [addressSource, setAddressSource] = useState("")
    const [carouselFinished, setCarouselFinished] = useState(false)
    const authWindowRef = useRef<Window | null>(null)
    const carouselRef = useRef<CarouselRef | null>(null)
    const query = useQueryState()

    const minimalAuthorizeAmount = Math.round(currency?.baseObject?.usd_price * Number(amount) + 5)

    const { startInterval } = useDelayedInterval(async () => {
        if (currentStepName !== SwapCreateStep.OAuth)
            return true

        const { access_token } = TokenService.getAuthData() || {};
        if (!access_token) {
            await goToStep(SwapCreateStep.Email)
            return true;
        }

        let authWindowHref = ""
        try {
            authWindowHref = authWindowRef.current?.location?.href
        }
        catch (e) {

        }
        if (!authWindowHref || authWindowHref?.indexOf(window.location.origin) === -1)
            return false

        const exchanges = await (await getUserExchanges(access_token))?.data
        const exchangeIsEnabled = exchanges?.some(e => e.exchange_id === exchange?.baseObject.id)
        if (!exchange?.baseObject?.authorization_flow || exchange?.baseObject?.authorization_flow == "none" || exchangeIsEnabled) {
            const authWindowURL = new URL(authWindowHref)
            const authorizedAmount = authWindowURL.searchParams.get("send_limit_amount")
            if (Number(authorizedAmount) < minimalAuthorizeAmount)
                toast.error("You did not authorize enough")
            else
                await goToStep(SwapCreateStep.Confirm)
            authWindowRef.current?.close()
            return true;
        }
        return false
    }, [currentStepName, authWindowRef, minimalAuthorizeAmount], 2000)


    const handleConnect = useCallback(() => {
        try {
            if (!carouselFinished) {
                carouselRef?.current?.next()
                return;
            }
            startInterval()
            const access_token = TokenService.getAuthData()?.access_token
            if (!access_token)
                goToStep(SwapCreateStep.Email)
            const { sub } = parseJwt(access_token) || {}
            const encoded = btoa(JSON.stringify({ UserId: sub, RedirectUrl: `${window.location.origin}/salon` }))
            authWindowRef.current = OpenLink({ link: o_auth_authorization_url + encoded, swap_data: swapFormData, query })
        }
        catch (e) {
            toast.error(e.message)
        }
    }, [o_auth_authorization_url, carouselRef, carouselFinished, addressSource, query])

    const exchange_name = exchange?.name
    const onCarouselLast = (value) => {
        setCarouselFinished(value)
    }

    return (
        <>
            <div className="w-full px-8 md:grid md:grid-flow-row min-h-[480px] text-primary-text font-light">

                <h3 className='md:mb-4 pt-2 text-xl text-center md:text-left font-roboto text-white font-semibold'>
                    Please connect your {exchange_name} account
                </h3>
                <div className="w-full">
                    <Carousel onLast={onCarouselLast} ref={carouselRef}>
                        <CarouselItem width={100} >
                            <div className='w-full whitespace-normal mb-6 text-primary'>
                                <span className='font-medium'>.01</span>
                                <div className='whitespace-normal text-white font-normal'>After this guide, you'll be taken to {exchange_name} to connect your account. You'll be prompted to log in to your {exchange_name} account if you are not logged in yet</div>
                            </div>
                            <div className='w-full md:w-1/2'>
                                <svg viewBox="0 0 413 484" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_1740_2402)">
                                        <rect x="3" width="407" height="844" rx="50" fill="url(#paint0_linear_1740_2402)" />
                                        <rect x="19" y="16" width="375" height="812" rx="36" fill="#2261EB" />
                                        <rect x="19" y="16" width="375" height="812" rx="36" fill="white" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M121.208 49.155V61.1442L121.752 61.3004C123.103 61.6882 124.281 61.9223 125.642 62.0732C126.556 62.1746 128.524 62.1897 129.296 62.1013C132.904 61.6879 135.452 60.1934 136.809 57.696C137.993 55.5174 138.128 52.3687 137.137 50.0928C136.054 47.6072 133.92 46.0703 130.828 45.5486C129.939 45.3986 128.267 45.3981 127.388 45.5476C126.662 45.6713 125.947 45.8571 125.44 46.0536L125.078 46.1945V41.6802V37.1659H123.143H121.208V49.155ZM96.5673 38.8585C95.4843 39.2095 94.7839 40.2459 94.977 41.2116C95.1683 42.1672 95.9862 42.9164 97.0205 43.0832C98.0097 43.2427 99.0739 42.697 99.5427 41.79C99.7276 41.4321 99.7381 41.3853 99.7366 40.9153C99.7354 40.5202 99.7108 40.3628 99.6161 40.1455C99.3761 39.595 98.8526 39.1117 98.2602 38.894C97.8241 38.7337 97.0054 38.7165 96.5673 38.8585ZM68.9765 45.4663C67.4557 45.6132 65.9535 46.1041 64.7251 46.8557C64.0211 47.2864 62.9787 48.2527 62.5068 48.912C61.4676 50.3638 61.0035 51.87 61 53.8021C60.9982 54.8342 61.0539 55.2878 61.2929 56.1851C62.1497 59.4026 64.8106 61.5773 68.4871 62.065C70.244 62.298 71.8535 62.1785 73.4582 61.6961C73.9805 61.5391 74.9456 61.1594 75.0373 61.0749C75.0587 61.0552 73.4614 58.7369 73.3568 58.636C73.3116 58.5923 73.1848 58.6124 72.8369 58.7182C72.0542 58.9564 71.3976 59.0325 70.3766 59.0036C69.3893 58.9755 68.821 58.8705 68.0488 58.5735C66.5413 57.9936 65.3878 56.67 65.0428 55.1245C64.7645 53.8776 64.8937 52.5164 65.3946 51.4184C65.8757 50.3637 66.9258 49.4289 68.1275 48.9853C68.9051 48.6983 69.4226 48.6175 70.4755 48.6186C71.4664 48.6196 72.0819 48.7029 72.8101 48.9344C72.9856 48.9902 73.1457 49.0189 73.1657 48.998C73.214 48.948 74.7749 46.5124 74.7749 46.4871C74.7749 46.4422 73.6903 46.0005 73.2302 45.8581C71.9769 45.4701 70.421 45.3268 68.9765 45.4663ZM82.8957 45.4663C78.9398 45.8484 75.987 48.3445 75.2376 51.9399C74.7339 54.3564 75.2288 56.8498 76.5869 58.7395C77.0487 59.3821 78.0511 60.3173 78.7395 60.7479C80.7532 62.0073 83.3731 62.4588 85.9751 61.9947C86.7891 61.8496 87.4551 61.6357 88.291 61.2509C89.9213 60.5005 91.1613 59.3534 91.9679 57.8495C92.3481 57.1405 92.5672 56.5481 92.7641 55.6967C92.9005 55.1073 92.9094 54.9903 92.9094 53.8021C92.9094 52.614 92.9005 52.497 92.7641 51.9076C92.2325 49.6093 91.0096 47.9012 89.0554 46.7276C87.3646 45.7123 85.116 45.2519 82.8957 45.4663ZM109.304 45.4624C107.385 45.5873 105.459 45.9392 103.661 46.4935L102.748 46.7752L102.734 54.2863L102.72 61.7975H104.655H106.59V55.4672V49.1368L106.872 49.062C107.837 48.8061 108.707 48.7129 110.137 48.7124C111.29 48.712 111.437 48.7217 111.819 48.8242C112.443 48.9912 112.859 49.2057 113.226 49.5499C113.61 49.9094 113.805 50.2267 113.967 50.7567C114.085 51.1451 114.085 51.1484 114.102 56.4714L114.118 61.7975H116.024H117.93L117.93 56.4714C117.93 51.0309 117.912 50.4693 117.717 49.6058C117.356 48.0091 116.433 46.8532 114.985 46.1835C113.614 45.5489 111.702 45.3063 109.304 45.4624ZM145.054 45.4615C143.83 45.5795 142.388 45.9521 141.321 46.4262L140.716 46.6948V48.2372C140.716 49.0855 140.73 49.7797 140.746 49.7797C140.762 49.7797 140.95 49.6918 141.162 49.5843C142.063 49.13 143.265 48.7567 144.29 48.613C144.913 48.5258 146.199 48.5114 146.628 48.5868C147.935 48.8162 148.764 49.4764 148.987 50.4649C149.02 50.6097 149.047 51.1042 149.047 51.5639V52.3996L147.206 52.4253C145.719 52.446 145.231 52.4704 144.667 52.5523C143.057 52.7858 142.046 53.106 141.124 53.6745C140.124 54.2909 139.546 55.0308 139.221 56.1114C139.151 56.3429 139.132 56.614 139.135 57.328C139.139 58.1819 139.149 58.2782 139.286 58.6919C139.849 60.3972 141.309 61.4264 143.829 61.8946C145.447 62.1953 147.775 62.213 150.139 61.9428C150.932 61.8522 152.143 61.6567 152.607 61.5444L152.808 61.4957L152.807 55.7991C152.807 52.2911 152.786 49.9689 152.753 49.7548C152.383 47.3505 150.844 45.96 148.079 45.5323C147.469 45.4379 145.723 45.3971 145.054 45.4615ZM160.735 45.4409C158.154 45.7007 156.451 46.7424 155.764 48.4804C155.454 49.267 155.365 50.2712 155.521 51.2285C155.669 52.1389 155.996 52.8015 156.583 53.3821C157.35 54.1415 158.367 54.6119 160.225 55.0675C162.068 55.5195 162.829 55.8113 163.305 56.2479C163.639 56.5544 163.776 56.8453 163.811 57.3245C163.861 58.0025 163.613 58.5034 163.06 58.8389C161.616 59.7148 158.469 59.2626 156.231 57.8578C155.941 57.6757 155.693 57.5267 155.68 57.5267C155.667 57.5267 155.657 58.275 155.657 59.1897V60.8527L155.882 60.9841C156.241 61.1935 156.976 61.4911 157.645 61.6978C159.172 62.1694 160.989 62.3017 162.697 62.0655C164.566 61.807 165.993 61.0667 166.807 59.9333C167.731 58.6475 167.84 56.4005 167.047 54.9953C166.751 54.4701 166.418 54.0993 165.91 53.7278C165.137 53.1634 163.989 52.7061 162.482 52.362C160.554 51.9219 159.621 51.4656 159.306 50.8083C159.121 50.4221 159.127 49.8086 159.321 49.4243C159.572 48.9238 160.048 48.5899 160.766 48.4086C161.516 48.2194 162.973 48.3329 164.078 48.6668C164.687 48.8507 165.723 49.329 166.204 49.648L166.62 49.9243V48.287V46.6496L166.446 46.5486C165.712 46.1246 164.494 45.7121 163.504 45.5524C162.902 45.4551 161.253 45.3887 160.735 45.4409ZM176.697 45.4404C173.831 45.7244 171.478 47.2208 170.223 49.5562C169.613 50.6923 169.305 51.7679 169.191 53.1686C169.056 54.822 169.356 56.466 170.04 57.821C170.791 59.3101 172.218 60.6283 173.826 61.3183C175.937 62.2245 178.603 62.4204 181.285 61.8663C182.322 61.6521 183.475 61.2302 184.148 60.8182L184.355 60.6917V59.13V57.5681L184.073 57.7244C183.505 58.0388 182.404 58.5128 181.889 58.6648C180.328 59.1249 178.315 59.2416 177.019 58.9472C174.907 58.4671 173.41 57.1125 173.009 55.3177C172.954 55.0714 172.909 54.8084 172.909 54.7333L172.908 54.5967H178.954H185L185 53.5911C185 52.3176 184.925 51.4071 184.758 50.6436C184.45 49.2384 183.869 48.1549 182.946 47.2662C182 46.3558 180.727 45.7703 179.171 45.5302C178.692 45.4563 177.114 45.399 176.697 45.4404ZM95.4656 53.7773V61.7975H97.4003H99.3351V53.7773V45.7572H97.4003H95.4656V53.7773ZM178.417 48.4943C179.143 48.6109 179.792 48.9362 180.299 49.4393C180.859 49.9936 181.236 50.8934 181.323 51.8846L181.36 52.3123H177.188C174.893 52.3123 173.016 52.2951 173.016 52.2741C173.016 52.2007 173.236 51.4909 173.34 51.2321C173.963 49.6718 175.252 48.6438 176.842 48.4395C177.219 48.3909 177.926 48.4155 178.417 48.4943ZM85.4318 48.6574C86.444 48.9357 87.2414 49.4351 87.8635 50.1804C89.3578 51.9708 89.4623 55.1756 88.0897 57.1185C87.548 57.8853 86.6997 58.5177 85.817 58.8129C83.9893 59.424 82.0279 59.0945 80.7023 57.9535C79.4902 56.9103 78.9065 55.4075 78.984 53.529C79.034 52.3173 79.3091 51.4022 79.8722 50.5738C80.5836 49.5275 81.631 48.8356 82.8881 48.5817C83.576 48.4428 84.7815 48.4786 85.4318 48.6574ZM129.598 48.7104C130.736 48.8945 131.734 49.3721 132.475 50.0868C133.422 51.0009 133.891 52.1826 133.891 53.6532C133.89 56.758 131.991 58.7381 128.695 59.0702C127.717 59.1688 126.136 59.0645 125.327 58.8482L125.104 58.7887V54.0737V49.3587L125.561 49.178C126.771 48.6994 128.379 48.5131 129.598 48.7104ZM149.047 57.0483V59.3012L148.576 59.36C147.808 59.4559 146.5 59.4836 145.882 59.417C144.421 59.2597 143.513 58.8028 143.113 58.0233C142.958 57.7227 142.947 57.663 142.948 57.1542C142.949 56.6537 142.962 56.583 143.106 56.31C143.484 55.5888 144.438 55.0732 145.715 54.9C145.936 54.87 146.178 54.8371 146.252 54.8271C146.326 54.8171 146.985 54.8058 147.716 54.8021L149.047 54.7954V57.0483Z" fill="#0251FD" />
                                        <rect x="43" y="425.375" width="327" height="44.2559" rx="5" fill="#1652F0" />
                                        <text fill="white" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="15" fontWeight="600" letterSpacing="-0.3px"><tspan x="182.828" y="453.299">Sign In</tspan></text>
                                        <line x1="19" y1="82.8459" x2="394" y2="82.8459" stroke="#C1C1D2" />
                                        <rect x="43" y="225.119" width="327" height="48.1043" rx="5" fill="url(#paint1_linear_1740_2402)" fillOpacity="0.7" />
                                        <rect x="43.5" y="225.619" width="326" height="47.1043" rx="4.5" stroke="url(#paint2_linear_1740_2402)" strokeOpacity="0.7" />
                                        <rect x="56" y="242.49" width="163" height="12.0261" rx="5" fill="url(#paint3_linear_1740_2402)" fillOpacity="0.9" />
                                        <rect x="43" y="159" width="182" height="12" rx="2" fill="url(#paint4_linear_1740_2402)" fillOpacity="0.7" />
                                        <rect x="44" y="206" width="82" height="9" rx="2" fill="url(#paint5_linear_1740_2402)" fillOpacity="0.9" />
                                        <rect x="43" y="320.119" width="327" height="48.1043" rx="5" fill="url(#paint6_linear_1740_2402)" fillOpacity="0.7" />
                                        <rect x="43.5" y="320.619" width="326" height="47.1043" rx="4.5" stroke="url(#paint7_linear_1740_2402)" strokeOpacity="0.7" />
                                        <rect x="56" y="337" width="119" height="13" rx="5" fill="url(#paint8_linear_1740_2402)" fillOpacity="0.9" />
                                        <rect x="44" y="301" width="104" height="9" rx="2" fill="url(#paint9_linear_1740_2402)" fillOpacity="0.9" />
                                        <rect x="43" y="396" width="82" height="12" rx="2" fill="url(#paint10_linear_1740_2402)" fillOpacity="0.7" />
                                        <rect x="43" y="128" width="303" height="18" rx="4" fill="url(#paint11_linear_1740_2402)" fillOpacity="0.9" />
                                        <rect x="19" y="16" width="375" height="812" rx="35" fill="#1E2639" fillOpacity="0.15" />
                                        <path opacity="0.5" d="M410 181H411.5C412.328 181 413 181.672 413 182.5V275.5C413 276.328 412.328 277 411.5 277H410V181Z" fill="black" />
                                        <path opacity="0.5" d="M3 239H1.5C0.671573 239 0 239.672 0 240.5V295.5C0 296.328 0.671573 297 1.5 297H3V239Z" fill="black" />
                                        <path opacity="0.5" d="M3 162H1.5C0.671573 162 0 162.672 0 163.5V218.5C0 219.328 0.671573 220 1.5 220H3V162Z" fill="black" />
                                        <path opacity="0.5" d="M3 101H1.5C0.671573 101 0 101.672 0 102.5V128.5C0 129.328 0.671573 130 1.5 130H3V101Z" fill="black" />
                                    </g>
                                    <defs>
                                        <linearGradient id="paint0_linear_1740_2402" x1="52.6826" y1="-2.48735e-06" x2="383.01" y2="197.618" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#3E3E3E" />
                                            <stop offset="1" />
                                        </linearGradient>
                                        <linearGradient id="paint1_linear_1740_2402" x1="43" y1="249.17" x2="370" y2="249.17" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#91919D" stopOpacity="0.99" />
                                            <stop offset="0.52191" stopColor="#91919D" stopOpacity="0.95" />
                                            <stop offset="1" stopColor="#FDFDFD" />
                                        </linearGradient>
                                        <linearGradient id="paint2_linear_1740_2402" x1="43" y1="249.17" x2="370" y2="249.17" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint3_linear_1740_2402" x1="56" y1="248.503" x2="221" y2="248.5" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <linearGradient id="paint4_linear_1740_2402" x1="43" y1="165" x2="225" y2="165" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint5_linear_1740_2402" x1="44" y1="210.5" x2="126" y2="210.5" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <linearGradient id="paint6_linear_1740_2402" x1="43" y1="344.17" x2="370" y2="344.17" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#91919D" stopOpacity="0.99" />
                                            <stop offset="0.52191" stopColor="#91919D" stopOpacity="0.95" />
                                            <stop offset="1" stopColor="#FDFDFD" />
                                        </linearGradient>
                                        <linearGradient id="paint7_linear_1740_2402" x1="43" y1="344.17" x2="370" y2="344.17" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint8_linear_1740_2402" x1="56" y1="343.5" x2="176.46" y2="343.499" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <linearGradient id="paint9_linear_1740_2402" x1="44" y1="305.5" x2="148" y2="305.5" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <linearGradient id="paint10_linear_1740_2402" x1="43" y1="402" x2="125" y2="402" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#1652F0" />
                                            <stop offset="1" stopColor="#A1BAFD" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint11_linear_1740_2402" x1="43" y1="137" x2="347.237" y2="137" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <clipPath id="clip0_1740_2402">
                                            <rect width="413" height="484" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>
                            </div>
                        </CarouselItem>
                        <CarouselItem width={100}>
                            <div className='w-full whitespace-normal mb-6 text-primary'>
                                <span className='font-medium'>.02</span>
                                <div className='whitespace-normal font-normal text-white'>When prompted to authorize Layerswap, click <span className='strong-highlight font-medium'>Change this amount</span></div>
                            </div>
                            <div className='w-full md:w-1/2'>
                                <svg viewBox="0 0 413 484" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_1741_2568)">
                                        <rect x="3" width="407" height="844" rx="50" fill="url(#paint0_linear_1741_2568)" />
                                        <rect x="19" y="16" width="375" height="812" rx="36" fill="#2261EB" />
                                        <rect x="19" y="16" width="375" height="812" rx="36" fill="white" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M121.208 49.155V61.1442L121.752 61.3004C123.103 61.6882 124.281 61.9223 125.642 62.0732C126.556 62.1746 128.524 62.1897 129.296 62.1013C132.904 61.6879 135.452 60.1934 136.809 57.696C137.993 55.5174 138.128 52.3687 137.137 50.0928C136.054 47.6072 133.92 46.0703 130.828 45.5486C129.939 45.3986 128.267 45.3981 127.388 45.5476C126.662 45.6713 125.947 45.8571 125.44 46.0536L125.078 46.1945V41.6802V37.1659H123.143H121.208V49.155ZM96.5673 38.8585C95.4843 39.2095 94.7839 40.2459 94.977 41.2116C95.1683 42.1672 95.9862 42.9164 97.0205 43.0832C98.0097 43.2427 99.0739 42.697 99.5427 41.79C99.7276 41.4321 99.7381 41.3853 99.7366 40.9153C99.7354 40.5202 99.7108 40.3628 99.6161 40.1455C99.3761 39.595 98.8526 39.1117 98.2602 38.894C97.8241 38.7337 97.0054 38.7165 96.5673 38.8585ZM68.9765 45.4663C67.4557 45.6132 65.9535 46.1041 64.7251 46.8557C64.0211 47.2864 62.9787 48.2527 62.5068 48.912C61.4676 50.3638 61.0035 51.87 61 53.8021C60.9982 54.8342 61.0539 55.2878 61.2929 56.1851C62.1497 59.4026 64.8106 61.5773 68.4871 62.065C70.244 62.298 71.8535 62.1785 73.4582 61.6961C73.9805 61.5391 74.9456 61.1594 75.0373 61.0749C75.0587 61.0552 73.4614 58.7369 73.3568 58.636C73.3116 58.5923 73.1848 58.6124 72.8369 58.7182C72.0542 58.9564 71.3976 59.0325 70.3766 59.0036C69.3893 58.9755 68.821 58.8705 68.0488 58.5735C66.5413 57.9936 65.3878 56.67 65.0428 55.1245C64.7645 53.8776 64.8937 52.5164 65.3946 51.4184C65.8757 50.3637 66.9258 49.4289 68.1275 48.9853C68.9051 48.6983 69.4226 48.6175 70.4755 48.6186C71.4664 48.6196 72.0819 48.7029 72.8101 48.9344C72.9856 48.9902 73.1457 49.0189 73.1657 48.998C73.214 48.948 74.7749 46.5124 74.7749 46.4871C74.7749 46.4422 73.6903 46.0005 73.2302 45.8581C71.9769 45.4701 70.421 45.3268 68.9765 45.4663ZM82.8957 45.4663C78.9398 45.8484 75.987 48.3445 75.2376 51.9399C74.7339 54.3564 75.2288 56.8498 76.5869 58.7395C77.0487 59.3821 78.0511 60.3173 78.7395 60.7479C80.7532 62.0073 83.3731 62.4588 85.9751 61.9947C86.7891 61.8496 87.4551 61.6357 88.291 61.2509C89.9213 60.5005 91.1613 59.3534 91.9679 57.8495C92.3481 57.1405 92.5672 56.5481 92.7641 55.6967C92.9005 55.1073 92.9094 54.9903 92.9094 53.8021C92.9094 52.614 92.9005 52.497 92.7641 51.9076C92.2325 49.6093 91.0096 47.9012 89.0554 46.7276C87.3646 45.7123 85.116 45.2519 82.8957 45.4663ZM109.304 45.4624C107.385 45.5873 105.459 45.9392 103.661 46.4935L102.748 46.7752L102.734 54.2863L102.72 61.7975H104.655H106.59V55.4672V49.1368L106.872 49.062C107.837 48.8061 108.707 48.7129 110.137 48.7124C111.29 48.712 111.437 48.7217 111.819 48.8242C112.443 48.9912 112.859 49.2057 113.226 49.5499C113.61 49.9094 113.805 50.2267 113.967 50.7567C114.085 51.1451 114.085 51.1484 114.102 56.4714L114.118 61.7975H116.024H117.93L117.93 56.4714C117.93 51.0309 117.912 50.4693 117.717 49.6058C117.356 48.0091 116.433 46.8532 114.985 46.1835C113.614 45.5489 111.702 45.3063 109.304 45.4624ZM145.054 45.4615C143.83 45.5795 142.388 45.9521 141.321 46.4262L140.716 46.6948V48.2372C140.716 49.0855 140.73 49.7797 140.746 49.7797C140.762 49.7797 140.95 49.6918 141.162 49.5843C142.063 49.13 143.265 48.7567 144.29 48.613C144.913 48.5258 146.199 48.5114 146.628 48.5868C147.935 48.8162 148.764 49.4764 148.987 50.4649C149.02 50.6097 149.047 51.1042 149.047 51.5639V52.3996L147.206 52.4253C145.719 52.446 145.231 52.4704 144.667 52.5523C143.057 52.7858 142.046 53.106 141.124 53.6745C140.124 54.2909 139.546 55.0308 139.221 56.1114C139.151 56.3429 139.132 56.614 139.135 57.328C139.139 58.1819 139.149 58.2782 139.286 58.6919C139.849 60.3972 141.309 61.4264 143.829 61.8946C145.447 62.1953 147.775 62.213 150.139 61.9428C150.932 61.8522 152.143 61.6567 152.607 61.5444L152.808 61.4957L152.807 55.7991C152.807 52.2911 152.786 49.9689 152.753 49.7548C152.383 47.3505 150.844 45.96 148.079 45.5323C147.469 45.4379 145.723 45.3971 145.054 45.4615ZM160.735 45.4409C158.154 45.7007 156.451 46.7424 155.764 48.4804C155.454 49.267 155.365 50.2712 155.521 51.2285C155.669 52.1389 155.996 52.8015 156.583 53.3821C157.35 54.1415 158.367 54.6119 160.225 55.0675C162.068 55.5195 162.829 55.8113 163.305 56.2479C163.639 56.5544 163.776 56.8453 163.811 57.3245C163.861 58.0025 163.613 58.5034 163.06 58.8389C161.616 59.7148 158.469 59.2626 156.231 57.8578C155.941 57.6757 155.693 57.5267 155.68 57.5267C155.667 57.5267 155.657 58.275 155.657 59.1897V60.8527L155.882 60.9841C156.241 61.1935 156.976 61.4911 157.645 61.6978C159.172 62.1694 160.989 62.3017 162.697 62.0655C164.566 61.807 165.993 61.0667 166.807 59.9333C167.731 58.6475 167.84 56.4005 167.047 54.9953C166.751 54.4701 166.418 54.0993 165.91 53.7278C165.137 53.1634 163.989 52.7061 162.482 52.362C160.554 51.9219 159.621 51.4656 159.306 50.8083C159.121 50.4221 159.127 49.8086 159.321 49.4243C159.572 48.9238 160.048 48.5899 160.766 48.4086C161.516 48.2194 162.973 48.3329 164.078 48.6668C164.687 48.8507 165.723 49.329 166.204 49.648L166.62 49.9243V48.287V46.6496L166.446 46.5486C165.712 46.1246 164.494 45.7121 163.504 45.5524C162.902 45.4551 161.253 45.3887 160.735 45.4409ZM176.697 45.4404C173.831 45.7244 171.478 47.2208 170.223 49.5562C169.613 50.6923 169.305 51.7679 169.191 53.1686C169.056 54.822 169.356 56.466 170.04 57.821C170.791 59.3101 172.218 60.6283 173.826 61.3183C175.937 62.2245 178.603 62.4204 181.285 61.8663C182.322 61.6521 183.475 61.2302 184.148 60.8182L184.355 60.6917V59.13V57.5681L184.073 57.7244C183.505 58.0388 182.404 58.5128 181.889 58.6648C180.328 59.1249 178.315 59.2416 177.019 58.9472C174.907 58.4671 173.41 57.1125 173.009 55.3177C172.954 55.0714 172.909 54.8084 172.909 54.7333L172.908 54.5967H178.954H185L185 53.5911C185 52.3176 184.925 51.4071 184.758 50.6436C184.45 49.2384 183.869 48.1549 182.946 47.2662C182 46.3558 180.727 45.7703 179.171 45.5302C178.692 45.4563 177.114 45.399 176.697 45.4404ZM95.4656 53.7773V61.7975H97.4003H99.3351V53.7773V45.7572H97.4003H95.4656V53.7773ZM178.417 48.4943C179.143 48.6109 179.792 48.9362 180.299 49.4393C180.859 49.9936 181.236 50.8934 181.323 51.8846L181.36 52.3123H177.188C174.893 52.3123 173.016 52.2951 173.016 52.2741C173.016 52.2007 173.236 51.4909 173.34 51.2321C173.963 49.6718 175.252 48.6438 176.842 48.4395C177.219 48.3909 177.926 48.4155 178.417 48.4943ZM85.4318 48.6574C86.444 48.9357 87.2414 49.4351 87.8635 50.1804C89.3578 51.9708 89.4623 55.1756 88.0897 57.1185C87.548 57.8853 86.6997 58.5177 85.817 58.8129C83.9893 59.424 82.0279 59.0945 80.7023 57.9535C79.4902 56.9103 78.9065 55.4075 78.984 53.529C79.034 52.3173 79.3091 51.4022 79.8722 50.5738C80.5836 49.5275 81.631 48.8356 82.8881 48.5817C83.576 48.4428 84.7815 48.4786 85.4318 48.6574ZM129.598 48.7104C130.736 48.8945 131.734 49.3721 132.475 50.0868C133.422 51.0009 133.891 52.1826 133.891 53.6532C133.89 56.758 131.991 58.7381 128.695 59.0702C127.717 59.1688 126.136 59.0645 125.327 58.8482L125.104 58.7887V54.0737V49.3587L125.561 49.178C126.771 48.6994 128.379 48.5131 129.598 48.7104ZM149.047 57.0483V59.3012L148.576 59.36C147.808 59.4559 146.5 59.4836 145.882 59.417C144.421 59.2597 143.513 58.8028 143.113 58.0233C142.958 57.7227 142.947 57.663 142.948 57.1542C142.949 56.6537 142.962 56.583 143.106 56.31C143.484 55.5888 144.438 55.0732 145.715 54.9C145.936 54.87 146.178 54.8371 146.252 54.8271C146.326 54.8171 146.985 54.8058 147.716 54.8021L149.047 54.7954V57.0483Z" fill="#0251FD" />
                                        <line x1="19" y1="82.8459" x2="394" y2="82.8459" stroke="#C1C1D2" />
                                        <rect x="43" y="166" width="110" height="7" rx="2" fill="url(#paint1_linear_1741_2568)" fillOpacity="0.7" />
                                        <rect x="43" y="128" width="303" height="18" rx="4" fill="url(#paint2_linear_1741_2568)" fillOpacity="0.9" />
                                        <text fill="black" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="16" fontWeight="bold" letterSpacing="-0.3px"><tspan x="43.2234" y="208.318">Debit money from your account</tspan></text>
                                        <text fill="black" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="15" letterSpacing="-0.3px"><tspan x="43" y="235.455">This app will be able to send 1 USD per month </tspan></text>
                                        <text fill="black" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="15" letterSpacing="-0.3px"><tspan x="43" y="259.273">on your behalf. </tspan></text>
                                        <text fill="#395FC9" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="20" letterSpacing="-0.3px" textDecoration="underline"><tspan x="147.492" y="259.273">Change this amount</tspan></text>
                                        <rect x="43" y="323" width="317" height="8" rx="2" fill="url(#paint3_linear_1741_2568)" fillOpacity="0.7" />
                                        <rect x="43" y="340" width="296" height="8" rx="2" fill="url(#paint4_linear_1741_2568)" fillOpacity="0.7" />
                                        <rect x="43" y="357" width="166" height="8" rx="2" fill="url(#paint5_linear_1741_2568)" fillOpacity="0.7" />
                                        <rect x="43" y="301" width="221" height="11" rx="4" fill="url(#paint6_linear_1741_2568)" fillOpacity="0.9" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M55 16C35.1178 16 19 32.1177 19 52V792C19 811.882 35.1178 828 55 828H358C377.882 828 394 811.882 394 792V52C394 32.1177 377.882 16 358 16H55ZM147 238C145.343 238 144 239.343 144 241V266C144 267.657 145.343 269 147 269H334C335.657 269 337 267.657 337 266V241C337 239.343 335.657 238 334 238H147Z" fill="#1E2639" fillOpacity="0.3" />
                                        <g filter="url(#filter0_d_1741_2568)">
                                            <rect x="144.15" y="238.15" width="192.7" height="30.7" rx="2.85" stroke="url(#paint7_linear_1741_2568)" strokeOpacity="0.5" strokeWidth="0.3" shapeRendering="crispEdges" />
                                        </g>
                                        <path opacity="0.5" d="M410 181H411.5C412.328 181 413 181.672 413 182.5V275.5C413 276.328 412.328 277 411.5 277H410V181Z" fill="black" />
                                        <path opacity="0.5" d="M3 239H1.5C0.671573 239 0 239.672 0 240.5V295.5C0 296.328 0.671573 297 1.5 297H3V239Z" fill="black" />
                                        <path opacity="0.5" d="M3 162H1.5C0.671573 162 0 162.672 0 163.5V218.5C0 219.328 0.671573 220 1.5 220H3V162Z" fill="black" />
                                        <path opacity="0.5" d="M3 101H1.5C0.671573 101 0 101.672 0 102.5V128.5C0 129.328 0.671573 130 1.5 130H3V101Z" fill="black" />
                                    </g>
                                    <defs>
                                        <filter id="filter0_d_1741_2568" x="137" y="231" width="209" height="47" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                            <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_1741_2568" />
                                            <feOffset dx="1" dy="1" />
                                            <feGaussianBlur stdDeviation="3.5" />
                                            <feComposite in2="hardAlpha" operator="out" />
                                            <feColorMatrix type="matrix" values="0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0.4 0" />
                                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1741_2568" />
                                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1741_2568" result="shape" />
                                        </filter>
                                        <linearGradient id="paint0_linear_1741_2568" x1="52.6826" y1="-2.48735e-06" x2="383.01" y2="197.618" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#3E3E3E" />
                                            <stop offset="1" />
                                        </linearGradient>
                                        <linearGradient id="paint1_linear_1741_2568" x1="43" y1="169.5" x2="153" y2="169.5" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint2_linear_1741_2568" x1="43" y1="137" x2="347.237" y2="137" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <linearGradient id="paint3_linear_1741_2568" x1="43" y1="327" x2="360" y2="327" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint4_linear_1741_2568" x1="43" y1="344" x2="339" y2="344" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint5_linear_1741_2568" x1="43" y1="361" x2="209" y2="361" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint6_linear_1741_2568" x1="43" y1="306.5" x2="264.902" y2="306.5" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <linearGradient id="paint7_linear_1741_2568" x1="144" y1="253.275" x2="337" y2="253.275" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#464244" />
                                            <stop offset="1" stopColor="#B1B1B1" stopOpacity="0" />
                                        </linearGradient>
                                        <clipPath id="clip0_1741_2568">
                                            <rect width="413" height="484" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>
                            </div>
                        </CarouselItem>
                        <CarouselItem width={100}>
                            <div className='w-full whitespace-normal mb-6 text-primary'>
                                <span className='font-medium'>.03</span>
                                <div className='whitespace-normal font-normal text-white'>Change the existing 1.0 value to <span className='strong-highlight font-medium'>{minimalAuthorizeAmount}</span> and click Save</div>
                            </div>
                            <div className='w-full md:w-1/2'>
                                <svg viewBox="0 0 413 484" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_1740_1883)">
                                        <rect x="3" width="407" height="844" rx="50" fill="url(#paint0_linear_1740_1883)" />
                                        <rect x="19" y="16" width="375" height="812" rx="36" fill="#2261EB" />
                                        <rect x="19" y="16" width="375" height="812" rx="36" fill="white" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M121.208 49.155V61.1442L121.752 61.3004C123.103 61.6882 124.281 61.9223 125.642 62.0732C126.556 62.1746 128.524 62.1897 129.296 62.1013C132.904 61.6879 135.452 60.1934 136.809 57.696C137.993 55.5174 138.128 52.3687 137.137 50.0928C136.054 47.6072 133.92 46.0703 130.828 45.5486C129.939 45.3986 128.267 45.3981 127.388 45.5476C126.662 45.6713 125.947 45.8571 125.44 46.0536L125.078 46.1945V41.6802V37.1659H123.143H121.208V49.155ZM96.5673 38.8585C95.4843 39.2095 94.7839 40.2459 94.977 41.2116C95.1683 42.1672 95.9862 42.9164 97.0205 43.0832C98.0097 43.2427 99.0739 42.697 99.5427 41.79C99.7276 41.4321 99.7381 41.3853 99.7366 40.9153C99.7354 40.5202 99.7108 40.3628 99.6161 40.1455C99.3761 39.595 98.8526 39.1117 98.2602 38.894C97.8241 38.7337 97.0054 38.7165 96.5673 38.8585ZM68.9765 45.4663C67.4557 45.6132 65.9535 46.1041 64.7251 46.8557C64.0211 47.2864 62.9787 48.2527 62.5068 48.912C61.4676 50.3638 61.0035 51.87 61 53.8021C60.9982 54.8342 61.0539 55.2878 61.2929 56.1851C62.1497 59.4026 64.8106 61.5773 68.4871 62.065C70.244 62.298 71.8535 62.1785 73.4582 61.6961C73.9805 61.5391 74.9456 61.1594 75.0373 61.0749C75.0587 61.0552 73.4614 58.7369 73.3568 58.636C73.3116 58.5923 73.1848 58.6124 72.8369 58.7182C72.0542 58.9564 71.3976 59.0325 70.3766 59.0036C69.3893 58.9755 68.821 58.8705 68.0488 58.5735C66.5413 57.9936 65.3878 56.67 65.0428 55.1245C64.7645 53.8776 64.8937 52.5164 65.3946 51.4184C65.8757 50.3637 66.9258 49.4289 68.1275 48.9853C68.9051 48.6983 69.4226 48.6175 70.4755 48.6186C71.4664 48.6196 72.0819 48.7029 72.8101 48.9344C72.9856 48.9902 73.1457 49.0189 73.1657 48.998C73.214 48.948 74.7749 46.5124 74.7749 46.4871C74.7749 46.4422 73.6903 46.0005 73.2302 45.8581C71.9769 45.4701 70.421 45.3268 68.9765 45.4663ZM82.8957 45.4663C78.9398 45.8484 75.987 48.3445 75.2376 51.9399C74.7339 54.3564 75.2288 56.8498 76.5869 58.7395C77.0487 59.3821 78.0511 60.3173 78.7395 60.7479C80.7532 62.0073 83.3731 62.4588 85.9751 61.9947C86.7891 61.8496 87.4551 61.6357 88.291 61.2509C89.9213 60.5005 91.1613 59.3534 91.9679 57.8495C92.3481 57.1405 92.5672 56.5481 92.7641 55.6967C92.9005 55.1073 92.9094 54.9903 92.9094 53.8021C92.9094 52.614 92.9005 52.497 92.7641 51.9076C92.2325 49.6093 91.0096 47.9012 89.0554 46.7276C87.3646 45.7123 85.116 45.2519 82.8957 45.4663ZM109.304 45.4624C107.385 45.5873 105.459 45.9392 103.661 46.4935L102.748 46.7752L102.734 54.2863L102.72 61.7975H104.655H106.59V55.4672V49.1368L106.872 49.062C107.837 48.8061 108.707 48.7129 110.137 48.7124C111.29 48.712 111.437 48.7217 111.819 48.8242C112.443 48.9912 112.859 49.2057 113.226 49.5499C113.61 49.9094 113.805 50.2267 113.967 50.7567C114.085 51.1451 114.085 51.1484 114.102 56.4714L114.118 61.7975H116.024H117.93L117.93 56.4714C117.93 51.0309 117.912 50.4693 117.717 49.6058C117.356 48.0091 116.433 46.8532 114.985 46.1835C113.614 45.5489 111.702 45.3063 109.304 45.4624ZM145.054 45.4615C143.83 45.5795 142.388 45.9521 141.321 46.4262L140.716 46.6948V48.2372C140.716 49.0855 140.73 49.7797 140.746 49.7797C140.762 49.7797 140.95 49.6918 141.162 49.5843C142.063 49.13 143.265 48.7567 144.29 48.613C144.913 48.5258 146.199 48.5114 146.628 48.5868C147.935 48.8162 148.764 49.4764 148.987 50.4649C149.02 50.6097 149.047 51.1042 149.047 51.5639V52.3996L147.206 52.4253C145.719 52.446 145.231 52.4704 144.667 52.5523C143.057 52.7858 142.046 53.106 141.124 53.6745C140.124 54.2909 139.546 55.0308 139.221 56.1114C139.151 56.3429 139.132 56.614 139.135 57.328C139.139 58.1819 139.149 58.2782 139.286 58.6919C139.849 60.3972 141.309 61.4264 143.829 61.8946C145.447 62.1953 147.775 62.213 150.139 61.9428C150.932 61.8522 152.143 61.6567 152.607 61.5444L152.808 61.4957L152.807 55.7991C152.807 52.2911 152.786 49.9689 152.753 49.7548C152.383 47.3505 150.844 45.96 148.079 45.5323C147.469 45.4379 145.723 45.3971 145.054 45.4615ZM160.735 45.4409C158.154 45.7007 156.451 46.7424 155.764 48.4804C155.454 49.267 155.365 50.2712 155.521 51.2285C155.669 52.1389 155.996 52.8015 156.583 53.3821C157.35 54.1415 158.367 54.6119 160.225 55.0675C162.068 55.5195 162.829 55.8113 163.305 56.2479C163.639 56.5544 163.776 56.8453 163.811 57.3245C163.861 58.0025 163.613 58.5034 163.06 58.8389C161.616 59.7148 158.469 59.2626 156.231 57.8578C155.941 57.6757 155.693 57.5267 155.68 57.5267C155.667 57.5267 155.657 58.275 155.657 59.1897V60.8527L155.882 60.9841C156.241 61.1935 156.976 61.4911 157.645 61.6978C159.172 62.1694 160.989 62.3017 162.697 62.0655C164.566 61.807 165.993 61.0667 166.807 59.9333C167.731 58.6475 167.84 56.4005 167.047 54.9953C166.751 54.4701 166.418 54.0993 165.91 53.7278C165.137 53.1634 163.989 52.7061 162.482 52.362C160.554 51.9219 159.621 51.4656 159.306 50.8083C159.121 50.4221 159.127 49.8086 159.321 49.4243C159.572 48.9238 160.048 48.5899 160.766 48.4086C161.516 48.2194 162.973 48.3329 164.078 48.6668C164.687 48.8507 165.723 49.329 166.204 49.648L166.62 49.9243V48.287V46.6496L166.446 46.5486C165.712 46.1246 164.494 45.7121 163.504 45.5524C162.902 45.4551 161.253 45.3887 160.735 45.4409ZM176.697 45.4404C173.831 45.7244 171.478 47.2208 170.223 49.5562C169.613 50.6923 169.305 51.7679 169.191 53.1686C169.056 54.822 169.356 56.466 170.04 57.821C170.791 59.3101 172.218 60.6283 173.826 61.3183C175.937 62.2245 178.603 62.4204 181.285 61.8663C182.322 61.6521 183.475 61.2302 184.148 60.8182L184.355 60.6917V59.13V57.5681L184.073 57.7244C183.505 58.0388 182.404 58.5128 181.889 58.6648C180.328 59.1249 178.315 59.2416 177.019 58.9472C174.907 58.4671 173.41 57.1125 173.009 55.3177C172.954 55.0714 172.909 54.8084 172.909 54.7333L172.908 54.5967H178.954H185L185 53.5911C185 52.3176 184.925 51.4071 184.758 50.6436C184.45 49.2384 183.869 48.1549 182.946 47.2662C182 46.3558 180.727 45.7703 179.171 45.5302C178.692 45.4563 177.114 45.399 176.697 45.4404ZM95.4656 53.7773V61.7975H97.4003H99.3351V53.7773V45.7572H97.4003H95.4656V53.7773ZM178.417 48.4943C179.143 48.6109 179.792 48.9362 180.299 49.4393C180.859 49.9936 181.236 50.8934 181.323 51.8846L181.36 52.3123H177.188C174.893 52.3123 173.016 52.2951 173.016 52.2741C173.016 52.2007 173.236 51.4909 173.34 51.2321C173.963 49.6718 175.252 48.6438 176.842 48.4395C177.219 48.3909 177.926 48.4155 178.417 48.4943ZM85.4318 48.6574C86.444 48.9357 87.2414 49.4351 87.8635 50.1804C89.3578 51.9708 89.4623 55.1756 88.0897 57.1185C87.548 57.8853 86.6997 58.5177 85.817 58.8129C83.9893 59.424 82.0279 59.0945 80.7023 57.9535C79.4902 56.9103 78.9065 55.4075 78.984 53.529C79.034 52.3173 79.3091 51.4022 79.8722 50.5738C80.5836 49.5275 81.631 48.8356 82.8881 48.5817C83.576 48.4428 84.7815 48.4786 85.4318 48.6574ZM129.598 48.7104C130.736 48.8945 131.734 49.3721 132.475 50.0868C133.422 51.0009 133.891 52.1826 133.891 53.6532C133.89 56.758 131.991 58.7381 128.695 59.0702C127.717 59.1688 126.136 59.0645 125.327 58.8482L125.104 58.7887V54.0737V49.3587L125.561 49.178C126.771 48.6994 128.379 48.5131 129.598 48.7104ZM149.047 57.0483V59.3012L148.576 59.36C147.808 59.4559 146.5 59.4836 145.882 59.417C144.421 59.2597 143.513 58.8028 143.113 58.0233C142.958 57.7227 142.947 57.663 142.948 57.1542C142.949 56.6537 142.962 56.583 143.106 56.31C143.484 55.5888 144.438 55.0732 145.715 54.9C145.936 54.87 146.178 54.8371 146.252 54.8271C146.326 54.8171 146.985 54.8058 147.716 54.8021L149.047 54.7954V57.0483Z" fill="#0251FD" />
                                        <rect x="251" y="244" width="119" height="47" rx="4" fill="#1652F0" />
                                        <text fill="white" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="15" fontWeight="600" letterSpacing="-0.3px"><tspan x="293.291" y="272.261">Save</tspan></text>
                                        <line x1="19" y1="82.8459" x2="394" y2="82.8459" stroke="#C1C1D2" />
                                        <rect x="43" y="163" width="317" height="12" rx="2" fill="url(#paint1_linear_1740_1883)" fillOpacity="0.7" />
                                        <rect x="43" y="132" width="245" height="18" rx="4" fill="url(#paint2_linear_1740_1883)" fillOpacity="0.9" />
                                        <rect x="43" y="185" width="95" height="12" rx="2" fill="url(#paint3_linear_1740_1883)" fillOpacity="0.7" />
                                        <rect x="43" y="403" width="317" height="12" rx="2" fill="url(#paint4_linear_1740_1883)" fillOpacity="0.7" />
                                        <rect x="43" y="425" width="296" height="12" rx="2" fill="url(#paint5_linear_1740_1883)" fillOpacity="0.7" />
                                        <rect x="43" y="447" width="244" height="12" rx="2" fill="url(#paint6_linear_1740_1883)" fillOpacity="0.7" />
                                        <rect x="43" y="372" width="241" height="18" rx="3" fill="url(#paint7_linear_1740_1883)" fillOpacity="0.9" />
                                        <rect x="43.75" y="249.75" width="108.5" height="38.5" stroke="#7B8FB8" strokeWidth="1.5" />
                                        <text fill="#4E4E4E" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="24" letterSpacing="-0.3px"><tspan x="49" y="278.227">{minimalAuthorizeAmount}</tspan></text>
                                        <text fill="black" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="16" letterSpacing="-0.3px"><tspan x="165.991" y="267.318">/ per&#10;</tspan><tspan x="159.467" y="286.318">month</tspan></text>
                                        <path fillRule="evenodd" clipRule="evenodd" d="M19 51C19 31.6701 34.67 16 54 16H359C378.33 16 394 31.67 394 51V792C394 811.33 378.33 827 359 827H54C34.67 827 19 811.33 19 792V51ZM32 245C32 241.134 35.134 238 39 238H217C220.866 238 224 241.134 224 245V300C224 303.866 220.866 307 217 307H39C35.134 307 32 303.866 32 300V245ZM311 305C329.778 305 345 289.778 345 271C345 252.222 329.778 237 311 237C292.222 237 277 252.222 277 271C277 289.778 292.222 305 311 305Z" fill="#1E2639" fillOpacity="0.3" />
                                        <g filter="url(#filter0_d_1740_1883)">
                                            <rect x="32.15" y="238.15" width="191.7" height="68.7" rx="6.85" stroke="url(#paint8_linear_1740_1883)" strokeOpacity="0.5" strokeWidth="0.3" shapeRendering="crispEdges" />
                                        </g>
                                        <g filter="url(#filter1_d_1740_1883)">
                                            <circle cx="311" cy="271" r="33.85" stroke="#464244" strokeOpacity="0.5" strokeWidth="0.3" shapeRendering="crispEdges" />
                                        </g>
                                        <path opacity="0.5" d="M410 181H411.5C412.328 181 413 181.672 413 182.5V275.5C413 276.328 412.328 277 411.5 277H410V181Z" fill="black" />
                                        <path opacity="0.5" d="M3 239H1.5C0.671573 239 0 239.672 0 240.5V295.5C0 296.328 0.671573 297 1.5 297H3V239Z" fill="black" />
                                        <path opacity="0.5" d="M3 162H1.5C0.671573 162 0 162.672 0 163.5V218.5C0 219.328 0.671573 220 1.5 220H3V162Z" fill="black" />
                                        <path opacity="0.5" d="M3 101H1.5C0.671573 101 0 101.672 0 102.5V128.5C0 129.328 0.671573 130 1.5 130H3V101Z" fill="black" />
                                        <rect x="3" width="407" height="844" rx="50" fill="url(#paint9_linear_1740_1883)" />
                                        <rect x="19" y="16" width="375" height="812" rx="36" fill="#2261EB" />
                                        <rect x="19" y="16" width="375" height="812" rx="36" fill="white" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M121.208 49.155V61.1442L121.752 61.3004C123.103 61.6882 124.281 61.9223 125.642 62.0732C126.556 62.1746 128.524 62.1897 129.296 62.1013C132.904 61.6879 135.452 60.1934 136.809 57.696C137.993 55.5174 138.128 52.3687 137.137 50.0928C136.054 47.6072 133.92 46.0703 130.828 45.5486C129.939 45.3986 128.267 45.3981 127.388 45.5476C126.662 45.6713 125.947 45.8571 125.44 46.0536L125.078 46.1945V41.6802V37.1659H123.143H121.208V49.155ZM96.5673 38.8585C95.4843 39.2095 94.7839 40.2459 94.977 41.2116C95.1683 42.1672 95.9862 42.9164 97.0205 43.0832C98.0097 43.2427 99.0739 42.697 99.5427 41.79C99.7276 41.4321 99.7381 41.3853 99.7366 40.9153C99.7354 40.5202 99.7108 40.3628 99.6161 40.1455C99.3761 39.595 98.8526 39.1117 98.2602 38.894C97.8241 38.7337 97.0054 38.7165 96.5673 38.8585ZM68.9765 45.4663C67.4557 45.6132 65.9535 46.1041 64.7251 46.8557C64.0211 47.2864 62.9787 48.2527 62.5068 48.912C61.4676 50.3638 61.0035 51.87 61 53.8021C60.9982 54.8342 61.0539 55.2878 61.2929 56.1851C62.1497 59.4026 64.8106 61.5773 68.4871 62.065C70.244 62.298 71.8535 62.1785 73.4582 61.6961C73.9805 61.5391 74.9456 61.1594 75.0373 61.0749C75.0587 61.0552 73.4614 58.7369 73.3568 58.636C73.3116 58.5923 73.1848 58.6124 72.8369 58.7182C72.0542 58.9564 71.3976 59.0325 70.3766 59.0036C69.3893 58.9755 68.821 58.8705 68.0488 58.5735C66.5413 57.9936 65.3878 56.67 65.0428 55.1245C64.7645 53.8776 64.8937 52.5164 65.3946 51.4184C65.8757 50.3637 66.9258 49.4289 68.1275 48.9853C68.9051 48.6983 69.4226 48.6175 70.4755 48.6186C71.4664 48.6196 72.0819 48.7029 72.8101 48.9344C72.9856 48.9902 73.1457 49.0189 73.1657 48.998C73.214 48.948 74.7749 46.5124 74.7749 46.4871C74.7749 46.4422 73.6903 46.0005 73.2302 45.8581C71.9769 45.4701 70.421 45.3268 68.9765 45.4663ZM82.8957 45.4663C78.9398 45.8484 75.987 48.3445 75.2376 51.9399C74.7339 54.3564 75.2288 56.8498 76.5869 58.7395C77.0487 59.3821 78.0511 60.3173 78.7395 60.7479C80.7532 62.0073 83.3731 62.4588 85.9751 61.9947C86.7891 61.8496 87.4551 61.6357 88.291 61.2509C89.9213 60.5005 91.1613 59.3534 91.9679 57.8495C92.3481 57.1405 92.5672 56.5481 92.7641 55.6967C92.9005 55.1073 92.9094 54.9903 92.9094 53.8021C92.9094 52.614 92.9005 52.497 92.7641 51.9076C92.2325 49.6093 91.0096 47.9012 89.0554 46.7276C87.3646 45.7123 85.116 45.2519 82.8957 45.4663ZM109.304 45.4624C107.385 45.5873 105.459 45.9392 103.661 46.4935L102.748 46.7752L102.734 54.2863L102.72 61.7975H104.655H106.59V55.4672V49.1368L106.872 49.062C107.837 48.8061 108.707 48.7129 110.137 48.7124C111.29 48.712 111.437 48.7217 111.819 48.8242C112.443 48.9912 112.859 49.2057 113.226 49.5499C113.61 49.9094 113.805 50.2267 113.967 50.7567C114.085 51.1451 114.085 51.1484 114.102 56.4714L114.118 61.7975H116.024H117.93L117.93 56.4714C117.93 51.0309 117.912 50.4693 117.717 49.6058C117.356 48.0091 116.433 46.8532 114.985 46.1835C113.614 45.5489 111.702 45.3063 109.304 45.4624ZM145.054 45.4615C143.83 45.5795 142.388 45.9521 141.321 46.4262L140.716 46.6948V48.2372C140.716 49.0855 140.73 49.7797 140.746 49.7797C140.762 49.7797 140.95 49.6918 141.162 49.5843C142.063 49.13 143.265 48.7567 144.29 48.613C144.913 48.5258 146.199 48.5114 146.628 48.5868C147.935 48.8162 148.764 49.4764 148.987 50.4649C149.02 50.6097 149.047 51.1042 149.047 51.5639V52.3996L147.206 52.4253C145.719 52.446 145.231 52.4704 144.667 52.5523C143.057 52.7858 142.046 53.106 141.124 53.6745C140.124 54.2909 139.546 55.0308 139.221 56.1114C139.151 56.3429 139.132 56.614 139.135 57.328C139.139 58.1819 139.149 58.2782 139.286 58.6919C139.849 60.3972 141.309 61.4264 143.829 61.8946C145.447 62.1953 147.775 62.213 150.139 61.9428C150.932 61.8522 152.143 61.6567 152.607 61.5444L152.808 61.4957L152.807 55.7991C152.807 52.2911 152.786 49.9689 152.753 49.7548C152.383 47.3505 150.844 45.96 148.079 45.5323C147.469 45.4379 145.723 45.3971 145.054 45.4615ZM160.735 45.4409C158.154 45.7007 156.451 46.7424 155.764 48.4804C155.454 49.267 155.365 50.2712 155.521 51.2285C155.669 52.1389 155.996 52.8015 156.583 53.3821C157.35 54.1415 158.367 54.6119 160.225 55.0675C162.068 55.5195 162.829 55.8113 163.305 56.2479C163.639 56.5544 163.776 56.8453 163.811 57.3245C163.861 58.0025 163.613 58.5034 163.06 58.8389C161.616 59.7148 158.469 59.2626 156.231 57.8578C155.941 57.6757 155.693 57.5267 155.68 57.5267C155.667 57.5267 155.657 58.275 155.657 59.1897V60.8527L155.882 60.9841C156.241 61.1935 156.976 61.4911 157.645 61.6978C159.172 62.1694 160.989 62.3017 162.697 62.0655C164.566 61.807 165.993 61.0667 166.807 59.9333C167.731 58.6475 167.84 56.4005 167.047 54.9953C166.751 54.4701 166.418 54.0993 165.91 53.7278C165.137 53.1634 163.989 52.7061 162.482 52.362C160.554 51.9219 159.621 51.4656 159.306 50.8083C159.121 50.4221 159.127 49.8086 159.321 49.4243C159.572 48.9238 160.048 48.5899 160.766 48.4086C161.516 48.2194 162.973 48.3329 164.078 48.6668C164.687 48.8507 165.723 49.329 166.204 49.648L166.62 49.9243V48.287V46.6496L166.446 46.5486C165.712 46.1246 164.494 45.7121 163.504 45.5524C162.902 45.4551 161.253 45.3887 160.735 45.4409ZM176.697 45.4404C173.831 45.7244 171.478 47.2208 170.223 49.5562C169.613 50.6923 169.305 51.7679 169.191 53.1686C169.056 54.822 169.356 56.466 170.04 57.821C170.791 59.3101 172.218 60.6283 173.826 61.3183C175.937 62.2245 178.603 62.4204 181.285 61.8663C182.322 61.6521 183.475 61.2302 184.148 60.8182L184.355 60.6917V59.13V57.5681L184.073 57.7244C183.505 58.0388 182.404 58.5128 181.889 58.6648C180.328 59.1249 178.315 59.2416 177.019 58.9472C174.907 58.4671 173.41 57.1125 173.009 55.3177C172.954 55.0714 172.909 54.8084 172.909 54.7333L172.908 54.5967H178.954H185L185 53.5911C185 52.3176 184.925 51.4071 184.758 50.6436C184.45 49.2384 183.869 48.1549 182.946 47.2662C182 46.3558 180.727 45.7703 179.171 45.5302C178.692 45.4563 177.114 45.399 176.697 45.4404ZM95.4656 53.7773V61.7975H97.4003H99.3351V53.7773V45.7572H97.4003H95.4656V53.7773ZM178.417 48.4943C179.143 48.6109 179.792 48.9362 180.299 49.4393C180.859 49.9936 181.236 50.8934 181.323 51.8846L181.36 52.3123H177.188C174.893 52.3123 173.016 52.2951 173.016 52.2741C173.016 52.2007 173.236 51.4909 173.34 51.2321C173.963 49.6718 175.252 48.6438 176.842 48.4395C177.219 48.3909 177.926 48.4155 178.417 48.4943ZM85.4318 48.6574C86.444 48.9357 87.2414 49.4351 87.8635 50.1804C89.3578 51.9708 89.4623 55.1756 88.0897 57.1185C87.548 57.8853 86.6997 58.5177 85.817 58.8129C83.9893 59.424 82.0279 59.0945 80.7023 57.9535C79.4902 56.9103 78.9065 55.4075 78.984 53.529C79.034 52.3173 79.3091 51.4022 79.8722 50.5738C80.5836 49.5275 81.631 48.8356 82.8881 48.5817C83.576 48.4428 84.7815 48.4786 85.4318 48.6574ZM129.598 48.7104C130.736 48.8945 131.734 49.3721 132.475 50.0868C133.422 51.0009 133.891 52.1826 133.891 53.6532C133.89 56.758 131.991 58.7381 128.695 59.0702C127.717 59.1688 126.136 59.0645 125.327 58.8482L125.104 58.7887V54.0737V49.3587L125.561 49.178C126.771 48.6994 128.379 48.5131 129.598 48.7104ZM149.047 57.0483V59.3012L148.576 59.36C147.808 59.4559 146.5 59.4836 145.882 59.417C144.421 59.2597 143.513 58.8028 143.113 58.0233C142.958 57.7227 142.947 57.663 142.948 57.1542C142.949 56.6537 142.962 56.583 143.106 56.31C143.484 55.5888 144.438 55.0732 145.715 54.9C145.936 54.87 146.178 54.8371 146.252 54.8271C146.326 54.8171 146.985 54.8058 147.716 54.8021L149.047 54.7954V57.0483Z" fill="#0251FD" />
                                        <rect x="251" y="244" width="119" height="47" rx="4" fill="#1652F0" />
                                        <text fill="white" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="15" fontWeight="600" letterSpacing="-0.3px"><tspan x="293.291" y="272.261">Save</tspan></text>
                                        <line x1="19" y1="82.8459" x2="394" y2="82.8459" stroke="#C1C1D2" />
                                        <rect x="43" y="163" width="317" height="12" rx="2" fill="url(#paint10_linear_1740_1883)" fillOpacity="0.7" />
                                        <rect x="43" y="132" width="245" height="18" rx="4" fill="url(#paint11_linear_1740_1883)" fillOpacity="0.9" />
                                        <rect x="43" y="185" width="95" height="12" rx="2" fill="url(#paint12_linear_1740_1883)" fillOpacity="0.7" />
                                        <rect x="43" y="403" width="317" height="12" rx="2" fill="url(#paint13_linear_1740_1883)" fillOpacity="0.7" />
                                        <rect x="43" y="425" width="296" height="12" rx="2" fill="url(#paint14_linear_1740_1883)" fillOpacity="0.7" />
                                        <rect x="43" y="447" width="244" height="12" rx="2" fill="url(#paint15_linear_1740_1883)" fillOpacity="0.7" />
                                        <rect x="43" y="372" width="241" height="18" rx="3" fill="url(#paint16_linear_1740_1883)" fillOpacity="0.9" />
                                        <rect x="43.75" y="249.75" width="108.5" height="38.5" stroke="#7B8FB8" strokeWidth="1.5" />
                                        <text fill="#4E4E4E" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="24" letterSpacing="-0.3px"><tspan x="49" y="278.227">{minimalAuthorizeAmount}</tspan></text>
                                        <text fill="black" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="16" letterSpacing="-0.3px"><tspan x="165.991" y="267.318">/ per&#10;</tspan><tspan x="159.467" y="286.318">month</tspan></text>
                                        <path fillRule="evenodd" clipRule="evenodd" d="M19 51C19 31.6701 34.67 16 54 16H359C378.33 16 394 31.67 394 51V792C394 811.33 378.33 827 359 827H54C34.67 827 19 811.33 19 792V51ZM32 245C32 241.134 35.134 238 39 238H217C220.866 238 224 241.134 224 245V300C224 303.866 220.866 307 217 307H39C35.134 307 32 303.866 32 300V245ZM311 305C329.778 305 345 289.778 345 271C345 252.222 329.778 237 311 237C292.222 237 277 252.222 277 271C277 289.778 292.222 305 311 305Z" fill="#1E2639" fillOpacity="0.3" />
                                        <g filter="url(#filter2_d_1740_1883)">
                                            <rect x="32.15" y="238.15" width="191.7" height="68.7" rx="6.85" stroke="url(#paint17_linear_1740_1883)" strokeOpacity="0.5" strokeWidth="0.3" shapeRendering="crispEdges" />
                                        </g>
                                        <g filter="url(#filter3_d_1740_1883)">
                                            <circle cx="311" cy="271" r="33.85" stroke="#464244" strokeOpacity="0.5" strokeWidth="0.3" shapeRendering="crispEdges" />
                                        </g>
                                        <path opacity="0.5" d="M410 181H411.5C412.328 181 413 181.672 413 182.5V275.5C413 276.328 412.328 277 411.5 277H410V181Z" fill="black" />
                                        <path opacity="0.5" d="M3 239H1.5C0.671573 239 0 239.672 0 240.5V295.5C0 296.328 0.671573 297 1.5 297H3V239Z" fill="black" />
                                        <path opacity="0.5" d="M3 162H1.5C0.671573 162 0 162.672 0 163.5V218.5C0 219.328 0.671573 220 1.5 220H3V162Z" fill="black" />
                                        <path opacity="0.5" d="M3 101H1.5C0.671573 101 0 101.672 0 102.5V128.5C0 129.328 0.671573 130 1.5 130H3V101Z" fill="black" />
                                    </g>
                                    <defs>
                                        <filter id="filter0_d_1740_1883" x="25" y="231" width="208" height="85" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                            <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_1740_1883" />
                                            <feOffset dx="1" dy="1" />
                                            <feGaussianBlur stdDeviation="3.5" />
                                            <feComposite in2="hardAlpha" operator="out" />
                                            <feColorMatrix type="matrix" values="0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0.4 0" />
                                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1740_1883" />
                                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1740_1883" result="shape" />
                                        </filter>
                                        <filter id="filter1_d_1740_1883" x="270" y="230" width="84" height="84" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                            <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_1740_1883" />
                                            <feOffset dx="1" dy="1" />
                                            <feGaussianBlur stdDeviation="3.5" />
                                            <feComposite in2="hardAlpha" operator="out" />
                                            <feColorMatrix type="matrix" values="0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0.4 0" />
                                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1740_1883" />
                                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1740_1883" result="shape" />
                                        </filter>
                                        <filter id="filter2_d_1740_1883" x="25" y="231" width="208" height="85" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                            <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_1740_1883" />
                                            <feOffset dx="1" dy="1" />
                                            <feGaussianBlur stdDeviation="3.5" />
                                            <feComposite in2="hardAlpha" operator="out" />
                                            <feColorMatrix type="matrix" values="0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0.4 0" />
                                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1740_1883" />
                                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1740_1883" result="shape" />
                                        </filter>
                                        <filter id="filter3_d_1740_1883" x="270" y="230" width="84" height="84" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                            <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_1740_1883" />
                                            <feOffset dx="1" dy="1" />
                                            <feGaussianBlur stdDeviation="3.5" />
                                            <feComposite in2="hardAlpha" operator="out" />
                                            <feColorMatrix type="matrix" values="0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0.4 0" />
                                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1740_1883" />
                                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1740_1883" result="shape" />
                                        </filter>
                                        <linearGradient id="paint0_linear_1740_1883" x1="52.6826" y1="-2.48735e-06" x2="383.01" y2="197.618" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#3E3E3E" />
                                            <stop offset="1" />
                                        </linearGradient>
                                        <linearGradient id="paint1_linear_1740_1883" x1="43" y1="169" x2="360" y2="169" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint2_linear_1740_1883" x1="43" y1="141" x2="289" y2="141" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <linearGradient id="paint3_linear_1740_1883" x1="43" y1="191" x2="138" y2="191" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint4_linear_1740_1883" x1="43" y1="409" x2="360" y2="409" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint5_linear_1740_1883" x1="43" y1="431" x2="339" y2="431" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint6_linear_1740_1883" x1="43" y1="453" x2="287" y2="453" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint7_linear_1740_1883" x1="43" y1="381" x2="285" y2="381" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <linearGradient id="paint8_linear_1740_1883" x1="32" y1="272" x2="224" y2="272" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#464244" />
                                            <stop offset="1" stopColor="#B1B1B1" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="paint9_linear_1740_1883" x1="52.6826" y1="-2.48735e-06" x2="383.01" y2="197.618" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#3E3E3E" />
                                            <stop offset="1" />
                                        </linearGradient>
                                        <linearGradient id="paint10_linear_1740_1883" x1="43" y1="169" x2="360" y2="169" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint11_linear_1740_1883" x1="43" y1="141" x2="289" y2="141" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <linearGradient id="paint12_linear_1740_1883" x1="43" y1="191" x2="138" y2="191" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint13_linear_1740_1883" x1="43" y1="409" x2="360" y2="409" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint14_linear_1740_1883" x1="43" y1="431" x2="339" y2="431" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint15_linear_1740_1883" x1="43" y1="453" x2="287" y2="453" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint16_linear_1740_1883" x1="43" y1="381" x2="285" y2="381" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <linearGradient id="paint17_linear_1740_1883" x1="32" y1="272" x2="224" y2="272" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#464244" />
                                            <stop offset="1" stopColor="#B1B1B1" stopOpacity="0" />
                                        </linearGradient>
                                        <clipPath id="clip0_1740_1883">
                                            <rect width="413" height="484" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>
                            </div>
                        </CarouselItem>
                        <CarouselItem width={100}>
                            <div className='w-full whitespace-normal mb-6 text-primary'>
                                <span className='font-medium'>.04</span>
                                <div className='whitespace-normal font-normal text-white'>Make sure that the allowed amount is <span className='strong-highlight font-medium'>{minimalAuthorizeAmount}</span> and click <span className='strong-highlight font-medium'>Authorize</span></div>
                            </div>
                            <div className='w-full md:w-1/2'>
                                <svg viewBox="0 0 413 484" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_1743_2570)">
                                        <rect x="3" width="407" height="844" rx="50" fill="url(#paint0_linear_1743_2570)" />
                                        <rect x="19" y="16" width="375" height="812" rx="36" fill="#2261EB" />
                                        <rect x="19" y="16" width="375" height="712" rx="36" fill="white" />
                                        <rect x="43" y="376" width="327" height="56" rx="4" fill="#1652F0" />
                                        <text fill="white" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="15" fontWeight="600" letterSpacing="-0.3px"><tspan x="172.141" y="407.455">Authorize</tspan></text>
                                        <rect x="43" y="66" width="110" height="7" rx="2" fill="url(#paint1_linear_1743_2570)" fillOpacity="0.7" />
                                        <rect x="43" y="302" width="110" height="7" rx="2" fill="url(#paint2_linear_1743_2570)" fillOpacity="0.9" />
                                        <rect x="43" y="28" width="303" height="18" rx="4" fill="url(#paint3_linear_1743_2570)" fillOpacity="0.9" />
                                        <text fill="black" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="16" fontWeight="bold" letterSpacing="-0.3px"><tspan x="43.2234" y="108.318">Debit money from your account</tspan></text>
                                        <text fill="black" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="15" letterSpacing="-0.3px"><tspan x="43" y="137.682">This app will be able to send </tspan></text>
                                        <text fill="black" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="17" letterSpacing="-0.3px"><tspan x="240.089" y="137.682">{minimalAuthorizeAmount} USD </tspan></text>
                                        <text fill="black" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="15" letterSpacing="-0.3px"><tspan x="43" y="161.455">per month on your behalf. </tspan></text>
                                        <text fill="#395FC9" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="15" letterSpacing="-0.3px"><tspan x="221.631" y="161.455">Change this amount</tspan></text>
                                        <rect x="43" y="223" width="317" height="8" rx="2" fill="url(#paint4_linear_1743_2570)" fillOpacity="0.7" />
                                        <rect x="43" y="240" width="296" height="8" rx="2" fill="url(#paint5_linear_1743_2570)" fillOpacity="0.7" />
                                        <rect x="43" y="257" width="166" height="8" rx="2" fill="url(#paint6_linear_1743_2570)" fillOpacity="0.7" />
                                        <rect x="43" y="322" width="228" height="8" rx="2" fill="url(#paint7_linear_1743_2570)" fillOpacity="0.7" />
                                        <rect x="43" y="339" width="74" height="8" rx="2" fill="url(#paint8_linear_1743_2570)" fillOpacity="0.7" />
                                        <rect x="43" y="201" width="221" height="11" rx="4" fill="url(#paint9_linear_1743_2570)" fillOpacity="0.9" />
                                        <g filter="url(#filter0_d_1743_2570)">
                                            <rect x="236.15" y="116.15" width="128.7" height="29.7" rx="2.85" stroke="url(#paint10_linear_1743_2570)" strokeOpacity="0.5" strokeWidth="0.3" shapeRendering="crispEdges" />
                                        </g>
                                        <g filter="url(#filter1_d_1743_2570)">
                                            <circle cx="191.5" cy="415.5" r="34.35" stroke="#464244" strokeOpacity="0.5" strokeWidth="0.3" shapeRendering="crispEdges" />
                                        </g>
                                        <path fillRule="evenodd" clipRule="evenodd" d="M19 52C19 32.1177 35.1178 16 55 16H358C377.882 16 394 32.1177 394 52V692C394 711.882 377.882 728 358 728H55C35.1178 728 19 711.882 19 692V52ZM236 119C236 117.343 237.343 116 239 116H362C363.657 116 365 117.343 365 119V143C365 144.657 363.657 146 362 146H239C237.343 146 236 144.657 236 143V119ZM191.5 450C210.554 450 226 434.554 226 415.5C226 396.446 210.554 381 191.5 381C172.446 381 157 396.446 157 415.5C157 434.554 172.446 450 191.5 450Z" fill="#1E2639" fillOpacity="0.3" />
                                        <path opacity="0.5" d="M410 181H411.5C412.328 181 413 181.672 413 182.5V275.5C413 276.328 412.328 277 411.5 277H410V181Z" fill="black" />
                                        <path opacity="0.5" d="M3 239H1.5C0.671573 239 0 239.672 0 240.5V295.5C0 296.328 0.671573 297 1.5 297H3V239Z" fill="black" />
                                        <path opacity="0.5" d="M3 162H1.5C0.671573 162 0 162.672 0 163.5V218.5C0 219.328 0.671573 220 1.5 220H3V162Z" fill="black" />
                                        <path opacity="0.5" d="M3 101H1.5C0.671573 101 0 101.672 0 102.5V128.5C0 129.328 0.671573 130 1.5 130H3V101Z" fill="black" />
                                    </g>
                                    <defs>
                                        <filter id="filter0_d_1743_2570" x="229" y="109" width="145" height="46" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                            <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_1743_2570" />
                                            <feOffset dx="1" dy="1" />
                                            <feGaussianBlur stdDeviation="3.5" />
                                            <feComposite in2="hardAlpha" operator="out" />
                                            <feColorMatrix type="matrix" values="0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0.4 0" />
                                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1743_2570" />
                                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1743_2570" result="shape" />
                                        </filter>
                                        <filter id="filter1_d_1743_2570" x="150" y="374" width="85" height="85" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                            <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_1743_2570" />
                                            <feOffset dx="1" dy="1" />
                                            <feGaussianBlur stdDeviation="3.5" />
                                            <feComposite in2="hardAlpha" operator="out" />
                                            <feColorMatrix type="matrix" values="0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0.4 0" />
                                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1743_2570" />
                                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1743_2570" result="shape" />
                                        </filter>
                                        <linearGradient id="paint0_linear_1743_2570" x1="52.6826" y1="-2.48735e-06" x2="383.01" y2="197.618" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#3E3E3E" />
                                            <stop offset="1" />
                                        </linearGradient>
                                        <linearGradient id="paint1_linear_1743_2570" x1="43" y1="69.4999" x2="153" y2="69.4999" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint2_linear_1743_2570" x1="43" y1="305.5" x2="153" y2="305.5" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <linearGradient id="paint3_linear_1743_2570" x1="43" y1="37" x2="347.237" y2="37" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <linearGradient id="paint4_linear_1743_2570" x1="43" y1="227" x2="360" y2="227" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint5_linear_1743_2570" x1="43" y1="244" x2="339" y2="244" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint6_linear_1743_2570" x1="43" y1="261" x2="209" y2="261" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint7_linear_1743_2570" x1="43" y1="326" x2="271" y2="326" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint8_linear_1743_2570" x1="43" y1="343" x2="117" y2="343" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint9_linear_1743_2570" x1="43" y1="206.5" x2="264.902" y2="206.5" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <linearGradient id="paint10_linear_1743_2570" x1="236" y1="130.783" x2="365" y2="130.783" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#464244" />
                                            <stop offset="1" stopColor="#B1B1B1" stopOpacity="0" />
                                        </linearGradient>
                                        <clipPath id="clip0_1743_2570">
                                            <rect width="413" height="484" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>
                            </div>
                        </CarouselItem>
                        <CarouselItem width={100}>
                            <div className='w-full whitespace-normal mb-6 text-primary'>
                                <span className='font-medium'>.05</span>
                                <div className='whitespace-normal font-medium text-white'>Please make sure to change the allowed amount to <span className='strong-highlight'>{minimalAuthorizeAmount}</span></div>
                            </div>
                            <div className='w-full md:w-1/2'>
                                <svg viewBox="0 0 447 484" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_1743_2866)">
                                        <rect x="3" width="407" height="844" rx="50" fill="url(#paint0_linear_1743_2866)" />
                                        <g clipPath="url(#clip1_1743_2866)">
                                            <rect x="19" y="16" width="375" height="812" rx="36" fill="#2261EB" />
                                            <rect x="19" y="16" width="375" height="651" rx="36" fill="white" />
                                            <text fill="black" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="16" fontWeight="bold" letterSpacing="-0.3px"><tspan x="43.2234" y="47.3182">Debit money from your account</tspan></text>
                                            <text fill="black" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="15" letterSpacing="-0.3px"><tspan x="43" y="74.4545">This app will be able to send 1 USD per month </tspan></text>
                                            <text fill="black" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="15" letterSpacing="-0.3px"><tspan x="43" y="98.2727">on your behalf. </tspan></text>
                                            <text fill="#395FC9" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="20" letterSpacing="-0.3px" textDecoration="underline"><tspan x="147.492" y="98.2727">Change this amount</tspan></text>
                                            <path fillRule="evenodd" clipRule="evenodd" d="M55 16C35.1178 16 19 32.1177 19 52V631C19 650.882 35.1178 667 55 667H358C377.882 667 394 650.882 394 631V52C394 32.1178 377.882 16 358 16H55ZM147 77C145.343 77 144 78.3431 144 80V105C144 106.657 145.343 108 147 108H334C335.657 108 337 106.657 337 105V80C337 78.3431 335.657 77 334 77H147Z" fill="#1E2639" fillOpacity="0.3" />
                                            <g filter="url(#filter0_d_1743_2866)">
                                                <rect x="144.15" y="77.15" width="192.7" height="30.7" rx="2.85" stroke="url(#paint1_linear_1743_2866)" strokeOpacity="0.5" strokeWidth="0.3" shapeRendering="crispEdges" />
                                            </g>
                                        </g>
                                        <path opacity="0.5" d="M410 181H411.5C412.328 181 413 181.672 413 182.5V275.5C413 276.328 412.328 277 411.5 277H410V181Z" fill="black" />
                                        <path opacity="0.5" d="M3 239H1.5C0.671573 239 0 239.672 0 240.5V295.5C0 296.328 0.671573 297 1.5 297H3V239Z" fill="black" />
                                        <path opacity="0.5" d="M3 162H1.5C0.671573 162 0 162.672 0 163.5V218.5C0 219.328 0.671573 220 1.5 220H3V162Z" fill="black" />
                                        <path opacity="0.5" d="M3 101H1.5C0.671573 101 0 101.672 0 102.5V128.5C0 129.328 0.671573 130 1.5 130H3V101Z" fill="black" />
                                        <g filter="url(#filter1_d_1743_2866)">
                                            <rect x="37" y="115" width="407" height="844" rx="50" fill="url(#paint2_linear_1743_2866)" />
                                            <rect x="53" y="131" width="375" height="812" rx="36" fill="#2261EB" />
                                            <rect x="53" y="131" width="375" height="812" rx="36" fill="white" />
                                            <path fillRule="evenodd" clipRule="evenodd" d="M155.208 164.155V176.144L155.752 176.3C157.103 176.688 158.281 176.922 159.642 177.073C160.556 177.175 162.524 177.19 163.296 177.101C166.904 176.688 169.452 175.193 170.809 172.696C171.993 170.517 172.128 167.369 171.137 165.093C170.054 162.607 167.92 161.07 164.828 160.549C163.939 160.399 162.267 160.398 161.388 160.548C160.662 160.671 159.947 160.857 159.44 161.054L159.078 161.194V156.68V152.166H157.143H155.208V164.155ZM130.567 153.858C129.484 154.209 128.784 155.246 128.977 156.212C129.168 157.167 129.986 157.916 131.021 158.083C132.01 158.243 133.074 157.697 133.543 156.79C133.728 156.432 133.738 156.385 133.737 155.915C133.735 155.52 133.711 155.363 133.616 155.145C133.376 154.595 132.853 154.112 132.26 153.894C131.824 153.734 131.005 153.716 130.567 153.858ZM102.977 160.466C101.456 160.613 99.9535 161.104 98.7251 161.856C98.0211 162.286 96.9787 163.253 96.5068 163.912C95.4676 165.364 95.0035 166.87 95 168.802C94.9982 169.834 95.0539 170.288 95.2929 171.185C96.1497 174.403 98.8106 176.577 102.487 177.065C104.244 177.298 105.854 177.178 107.458 176.696C107.981 176.539 108.946 176.159 109.037 176.075C109.059 176.055 107.461 173.737 107.357 173.636C107.312 173.592 107.185 173.612 106.837 173.718C106.054 173.956 105.398 174.033 104.377 174.004C103.389 173.975 102.821 173.871 102.049 173.573C100.541 172.994 99.3878 171.67 99.0428 170.124C98.7645 168.878 98.8937 167.516 99.3946 166.418C99.8757 165.364 100.926 164.429 102.128 163.985C102.905 163.698 103.423 163.617 104.476 163.619C105.466 163.62 106.082 163.703 106.81 163.934C106.986 163.99 107.146 164.019 107.166 163.998C107.214 163.948 108.775 161.512 108.775 161.487C108.775 161.442 107.69 161.001 107.23 160.858C105.977 160.47 104.421 160.327 102.977 160.466ZM116.896 160.466C112.94 160.848 109.987 163.344 109.238 166.94C108.734 169.356 109.229 171.85 110.587 173.74C111.049 174.382 112.051 175.317 112.74 175.748C114.753 177.007 117.373 177.459 119.975 176.995C120.789 176.85 121.455 176.636 122.291 176.251C123.921 175.5 125.161 174.353 125.968 172.849C126.348 172.14 126.567 171.548 126.764 170.697C126.9 170.107 126.909 169.99 126.909 168.802C126.909 167.614 126.9 167.497 126.764 166.908C126.233 164.609 125.01 162.901 123.055 161.728C121.365 160.712 119.116 160.252 116.896 160.466ZM143.304 160.462C141.385 160.587 139.459 160.939 137.661 161.493L136.748 161.775L136.734 169.286L136.72 176.797H138.655H140.59V170.467V164.137L140.872 164.062C141.837 163.806 142.707 163.713 144.137 163.712C145.29 163.712 145.437 163.722 145.819 163.824C146.443 163.991 146.859 164.206 147.226 164.55C147.61 164.909 147.805 165.227 147.967 165.757C148.085 166.145 148.085 166.148 148.102 171.471L148.118 176.797H150.024H151.93L151.93 171.471C151.93 166.031 151.912 165.469 151.717 164.606C151.356 163.009 150.433 161.853 148.985 161.183C147.614 160.549 145.702 160.306 143.304 160.462ZM179.054 160.461C177.83 160.579 176.388 160.952 175.321 161.426L174.716 161.695V163.237C174.716 164.086 174.73 164.78 174.746 164.78C174.762 164.78 174.95 164.692 175.162 164.584C176.063 164.13 177.265 163.757 178.29 163.613C178.913 163.526 180.199 163.511 180.628 163.587C181.935 163.816 182.764 164.476 182.987 165.465C183.02 165.61 183.047 166.104 183.047 166.564V167.4L181.206 167.425C179.719 167.446 179.231 167.47 178.667 167.552C177.057 167.786 176.046 168.106 175.124 168.674C174.124 169.291 173.546 170.031 173.221 171.111C173.151 171.343 173.132 171.614 173.135 172.328C173.139 173.182 173.149 173.278 173.286 173.692C173.849 175.397 175.309 176.426 177.829 176.895C179.447 177.195 181.775 177.213 184.139 176.943C184.932 176.852 186.143 176.657 186.607 176.544L186.808 176.496L186.807 170.799C186.807 167.291 186.786 164.969 186.753 164.755C186.383 162.35 184.844 160.96 182.079 160.532C181.469 160.438 179.723 160.397 179.054 160.461ZM194.735 160.441C192.154 160.701 190.451 161.742 189.764 163.48C189.454 164.267 189.365 165.271 189.521 166.229C189.669 167.139 189.996 167.802 190.583 168.382C191.35 169.141 192.367 169.612 194.225 170.068C196.068 170.519 196.829 170.811 197.305 171.248C197.639 171.554 197.776 171.845 197.811 172.324C197.861 173.002 197.613 173.503 197.06 173.839C195.616 174.715 192.469 174.263 190.231 172.858C189.941 172.676 189.693 172.527 189.68 172.527C189.667 172.527 189.657 173.275 189.657 174.19V175.853L189.882 175.984C190.241 176.193 190.976 176.491 191.645 176.698C193.172 177.169 194.989 177.302 196.697 177.065C198.566 176.807 199.993 176.067 200.807 174.933C201.731 173.647 201.84 171.4 201.047 169.995C200.751 169.47 200.418 169.099 199.91 168.728C199.137 168.163 197.989 167.706 196.482 167.362C194.554 166.922 193.621 166.466 193.306 165.808C193.121 165.422 193.127 164.809 193.321 164.424C193.572 163.924 194.048 163.59 194.766 163.409C195.516 163.219 196.973 163.333 198.078 163.667C198.687 163.851 199.723 164.329 200.204 164.648L200.62 164.924V163.287V161.65L200.446 161.549C199.712 161.125 198.494 160.712 197.504 160.552C196.902 160.455 195.253 160.389 194.735 160.441ZM210.697 160.44C207.831 160.724 205.478 162.221 204.223 164.556C203.613 165.692 203.305 166.768 203.191 168.169C203.056 169.822 203.356 171.466 204.04 172.821C204.791 174.31 206.218 175.628 207.826 176.318C209.937 177.224 212.603 177.42 215.285 176.866C216.322 176.652 217.475 176.23 218.148 175.818L218.355 175.692V174.13V172.568L218.073 172.724C217.505 173.039 216.404 173.513 215.889 173.665C214.328 174.125 212.315 174.242 211.019 173.947C208.907 173.467 207.41 172.112 207.009 170.318C206.954 170.071 206.909 169.808 206.909 169.733L206.908 169.597H212.954H219L219 168.591C219 167.318 218.925 166.407 218.758 165.644C218.45 164.238 217.869 163.155 216.946 162.266C216 161.356 214.727 160.77 213.171 160.53C212.692 160.456 211.114 160.399 210.697 160.44ZM129.466 168.777V176.797H131.4H133.335V168.777V160.757H131.4H129.466V168.777ZM212.417 163.494C213.143 163.611 213.792 163.936 214.299 164.439C214.859 164.994 215.236 165.893 215.323 166.885L215.36 167.312H211.188C208.893 167.312 207.016 167.295 207.016 167.274C207.016 167.201 207.236 166.491 207.34 166.232C207.963 164.672 209.252 163.644 210.842 163.439C211.219 163.391 211.926 163.415 212.417 163.494ZM119.432 163.657C120.444 163.936 121.241 164.435 121.863 165.18C123.358 166.971 123.462 170.176 122.09 172.118C121.548 172.885 120.7 173.518 119.817 173.813C117.989 174.424 116.028 174.094 114.702 172.953C113.49 171.91 112.907 170.407 112.984 168.529C113.034 167.317 113.309 166.402 113.872 165.574C114.584 164.527 115.631 163.836 116.888 163.582C117.576 163.443 118.782 163.479 119.432 163.657ZM163.598 163.71C164.736 163.894 165.734 164.372 166.475 165.087C167.422 166.001 167.891 167.183 167.891 168.653C167.89 171.758 165.991 173.738 162.695 174.07C161.717 174.169 160.136 174.064 159.327 173.848L159.104 173.789V169.074V164.359L159.561 164.178C160.771 163.699 162.379 163.513 163.598 163.71ZM183.047 172.048V174.301L182.576 174.36C181.808 174.456 180.5 174.484 179.882 174.417C178.421 174.26 177.513 173.803 177.113 173.023C176.958 172.723 176.947 172.663 176.948 172.154C176.949 171.654 176.962 171.583 177.106 171.31C177.484 170.589 178.438 170.073 179.715 169.9C179.936 169.87 180.178 169.837 180.252 169.827C180.326 169.817 180.985 169.806 181.716 169.802L183.047 169.795V172.048Z" fill="#0251FD" />
                                            <rect x="285" y="359" width="119" height="47" rx="4" fill="#1652F0" />
                                            <text fill="white" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="15" fontWeight="600" letterSpacing="-0.3px"><tspan x="327.291" y="387.261">Save</tspan></text>
                                            <line x1="53" y1="197.846" x2="428" y2="197.846" stroke="#C1C1D2" />
                                            <rect x="77" y="278" width="317" height="12" rx="2" fill="url(#paint3_linear_1743_2866)" fillOpacity="0.7" />
                                            <rect x="77" y="247" width="245" height="18" rx="4" fill="url(#paint4_linear_1743_2866)" fillOpacity="0.9" />
                                            <rect x="77" y="300" width="95" height="12" rx="2" fill="url(#paint5_linear_1743_2866)" fillOpacity="0.7" />
                                            <rect x="77.75" y="364.75" width="108.5" height="38.5" stroke="#7B8FB8" strokeWidth="1.5" />
                                            <text fill="#4E4E4E" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="24" letterSpacing="-0.3px"><tspan x="83" y="393.227">{minimalAuthorizeAmount}</tspan></text>
                                            <text fill="black" style={{ whiteSpace: "pre" }} fontFamily="Inter" fontSize="16" letterSpacing="-0.3px"><tspan x="199.991" y="382.318">/ per&#10;</tspan><tspan x="193.467" y="401.318">month</tspan></text>
                                            <path fillRule="evenodd" clipRule="evenodd" d="M53 166C53 146.67 68.67 131 88 131H393C412.33 131 428 146.67 428 166V907C428 926.33 412.33 942 393 942H88C68.67 942 53 926.33 53 907V166ZM66 360C66 356.134 69.134 353 73 353H251C254.866 353 258 356.134 258 360V415C258 418.866 254.866 422 251 422H73C69.134 422 66 418.866 66 415V360ZM345 420C363.778 420 379 404.778 379 386C379 367.222 363.778 352 345 352C326.222 352 311 367.222 311 386C311 404.778 326.222 420 345 420Z" fill="#1E2639" fillOpacity="0.3" />
                                            <g filter="url(#filter2_d_1743_2866)">
                                                <rect x="66.15" y="353.15" width="191.7" height="68.7" rx="6.85" stroke="url(#paint6_linear_1743_2866)" strokeOpacity="0.5" strokeWidth="0.3" shapeRendering="crispEdges" />
                                            </g>
                                            <g filter="url(#filter3_d_1743_2866)">
                                                <circle cx="345" cy="386" r="33.85" stroke="#464244" strokeOpacity="0.5" strokeWidth="0.3" shapeRendering="crispEdges" />
                                            </g>
                                            <path opacity="0.5" d="M444 296H445.5C446.328 296 447 296.672 447 297.5V390.5C447 391.328 446.328 392 445.5 392H444V296Z" fill="black" />
                                            <path opacity="0.5" d="M37 354H35.5C34.6716 354 34 354.672 34 355.5V410.5C34 411.328 34.6716 412 35.5 412H37V354Z" fill="black" />
                                            <path opacity="0.5" d="M37 277H35.5C34.6716 277 34 277.672 34 278.5V333.5C34 334.328 34.6716 335 35.5 335H37V277Z" fill="black" />
                                            <path opacity="0.5" d="M37 216H35.5C34.6716 216 34 216.672 34 217.5V243.5C34 244.328 34.6716 245 35.5 245H37V216Z" fill="black" />
                                        </g>
                                    </g>
                                    <defs>
                                        <filter id="filter0_d_1743_2866" x="137" y="70" width="209" height="47" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                            <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_1743_2866" />
                                            <feOffset dx="1" dy="1" />
                                            <feGaussianBlur stdDeviation="3.5" />
                                            <feComposite in2="hardAlpha" operator="out" />
                                            <feColorMatrix type="matrix" values="0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0.4 0" />
                                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1743_2866" />
                                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1743_2866" result="shape" />
                                        </filter>
                                        <filter id="filter1_d_1743_2866" x="7" y="88" width="449" height="880" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                            <feOffset dx="-9" dy="-9" />
                                            <feGaussianBlur stdDeviation="9" />
                                            <feComposite in2="hardAlpha" operator="out" />
                                            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1743_2866" />
                                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1743_2866" result="shape" />
                                        </filter>
                                        <filter id="filter2_d_1743_2866" x="59" y="346" width="208" height="85" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                            <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_1743_2866" />
                                            <feOffset dx="1" dy="1" />
                                            <feGaussianBlur stdDeviation="3.5" />
                                            <feComposite in2="hardAlpha" operator="out" />
                                            <feColorMatrix type="matrix" values="0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0.4 0" />
                                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1743_2866" />
                                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1743_2866" result="shape" />
                                        </filter>
                                        <filter id="filter3_d_1743_2866" x="304" y="345" width="84" height="84" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                            <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_1743_2866" />
                                            <feOffset dx="1" dy="1" />
                                            <feGaussianBlur stdDeviation="3.5" />
                                            <feComposite in2="hardAlpha" operator="out" />
                                            <feColorMatrix type="matrix" values="0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0 0.175 0 0 0 0.4 0" />
                                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1743_2866" />
                                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1743_2866" result="shape" />
                                        </filter>
                                        <linearGradient id="paint0_linear_1743_2866" x1="52.6826" y1="-2.48735e-06" x2="383.01" y2="197.618" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#3E3E3E" />
                                            <stop offset="1" />
                                        </linearGradient>
                                        <linearGradient id="paint1_linear_1743_2866" x1="144" y1="92.2754" x2="337" y2="92.2754" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#464244" />
                                            <stop offset="1" stopColor="#B1B1B1" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="paint2_linear_1743_2866" x1="86.6826" y1="115" x2="417.01" y2="312.618" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#3E3E3E" />
                                            <stop offset="1" />
                                        </linearGradient>
                                        <linearGradient id="paint3_linear_1743_2866" x1="77" y1="284" x2="394" y2="284" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint4_linear_1743_2866" x1="77" y1="256" x2="323" y2="256" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#141212" />
                                            <stop offset="0.9999" stopColor="#8E8E9C" />
                                            <stop offset="1" stopColor="#1F1414" stopOpacity="0.94" />
                                        </linearGradient>
                                        <linearGradient id="paint5_linear_1743_2866" x1="77" y1="306" x2="172" y2="306" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#4D4D4D" />
                                            <stop offset="1" stopColor="#91919D" stopOpacity="0.95" />
                                        </linearGradient>
                                        <linearGradient id="paint6_linear_1743_2866" x1="66" y1="387" x2="258" y2="387" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#464244" />
                                            <stop offset="1" stopColor="#B1B1B1" stopOpacity="0" />
                                        </linearGradient>
                                        <clipPath id="clip0_1743_2866">
                                            <rect width="447" height="484" fill="white" />
                                        </clipPath>
                                        <clipPath id="clip1_1743_2866">
                                            <rect x="19" y="16" width="375" height="812" rx="36" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>
                            </div>
                        </CarouselItem>

                    </Carousel>
                </div>

                <div className="text-white text-sm  mt-auto">
                    <div className="flex md:mt-5 font-normal text-sm text-primary-text mb-3">
                        <label className="block font-lighter text-left leading-6"> Even after authorization Layerswap can't initiate a withdrawal without your explicit confirmation.</label>
                    </div>

                    <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleConnect}>
                        {
                            carouselFinished ? "Connect" : "Next"
                        }
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default AccountConnectStep;