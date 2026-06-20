import { type HTMLAttributes, type SVGAttributes } from "react";
import { classNames } from "@/utils"; // lucide lucide-funnel-x and hand modificaton of IconFilterOff

export function IconFilterGreen({ className, title, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("stroke-[1.5] stroke-current fill-none", className)} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="M12.531 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14v6a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341l.427-.473" />
            <circle className="fill-green-500 dark:fill-green-400" cx="18" cy="6" r="5" />
        </svg>
    );
}
