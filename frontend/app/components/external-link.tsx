import { Link } from 'expo-router';
import { type ComponentProps } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href as any}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          e.preventDefault();
          WebBrowser.openBrowserAsync(href);
        }
      }}
    />
  );
}
