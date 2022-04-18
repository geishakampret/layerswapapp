import { SwitchHorizontalIcon } from "@heroicons/react/outline";
import { FC, MouseEventHandler } from "react";
import SubmitButton from "./submitButton";

export interface SwapButtonProps {
    isDisabled: boolean;
    isSubmitting: boolean;
    type?: 'submit' | 'reset' | 'button' | undefined;
    onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
}

const SwapButton: FC<SwapButtonProps> = (props) => {
    const swapIcon =   <SwitchHorizontalIcon className="h-5 w-5" aria-hidden="true" />;
    
    return (
      <SubmitButton icon={swapIcon} defaultStyle="bg-gradient-to-r from-indigo-400 to-pink-400" {...props}/>
    );
}

export default SwapButton;