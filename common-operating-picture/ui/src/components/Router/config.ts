import { SourceTypes } from '@/pages/SourceTypes';
import { InboxOutlined, InsertChartOutlined, Language, Radar, TuneOutlined } from '@mui/icons-material';
import { SvgIconTypeMap } from '@mui/material';
import { OverridableComponent } from '@mui/material/OverridableComponent';

type PageConfig = {
  name: string;
  path: string;
  component?: () => JSX.Element;
  description: string;
  image: string;
  icon: MenuIcon;
};

// make it easier to use the MUI icons in config
type MenuIcon = OverridableComponent<SvgIconTypeMap<NonNullable<unknown>, 'svg'>> & {
  muiName: string;
}

export const paths = {
  Home: '/',
  SourceTypes: '/source-types',
};

export const pages: PageConfig[] = [
  // todo: uncomment to test Nifi record decryption
  // {
  //   name: 'Nifi',
  //   path: '/nifi',
  //   component: Nifi,
  //   description: 'Nifi decrypt test page',
  //   image: 'https://placehold.co/600x400?text=DEMO',
  //   icon: Language,
  // },
  {
    name: 'Source Types',
    path: paths.SourceTypes,
    component: SourceTypes,
    description: 'Submit and Search Source Types that are encrypted end-to-end and viewable on COPs only with Need to Know',
    image: '/img/employees.png',
    icon: Language,
  },
  {
    name: 'SITREP Submit',
    // todo: add type safety for query params
    path: `${paths.SourceTypes}?type=sitrep&select=false&mode=create`,
    component: SourceTypes,
    description: 'Submit Reports and SITREPS that are encrypted end-to-end and viewable on COPs only with Need to Know',
    image: '/img/sitrep-submit.png',
    icon: Language,
  },
  {
    name: 'OPNET',
    path: paths.Home,
    description: 'Search and Review SITREPs across Regions',
    image: '/img/opnet.png',
    icon: Radar,
  },
  {
    name: 'Executive Report',
    path: paths.Home,
    description: 'Generate periodic reports with customizable templates',
    image: '/img/execreport.png',
    icon: InsertChartOutlined,
  },
  {
    name: 'Dropbox',
    path: paths.Home,
    description: 'Securely Share files with those that need to know.',
    image: '/img/dropbox.png',
    icon: InboxOutlined,
  },
  {
    name: 'Executive Dashboard',
    path: paths.Home,
    description: 'View high level data and trends',
    image: '/img/unsplash-data.png',
    icon: TuneOutlined,
  },
];
