import type {SVGIconProps} from './svgIcon';
import {SvgIcon} from './svgIcon';

function IconBitbucket(props: SVGIconProps) {
  return (
    <SvgIcon {...props} kind="path">
      <path d="M15.56.82H.52A.51.51,0,0,0,0,1.32.19.19,0,0,0,0,1.4L2.18,14.61a.7.7,0,0,0,.68.58H13.3a.52.52,0,0,0,.51-.43L16,1.41A.5.5,0,0,0,15.56.82ZM9.68,10.35H6.35l-.9-4.71h5Z" />
    </SvgIcon>
  );
}

IconBitbucket.displayName = 'IconBitbucket';

export {IconBitbucket};
