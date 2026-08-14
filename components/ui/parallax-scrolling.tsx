'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

import './parallax-scrolling.css';

export interface ParallaxLayerImage {
  /** Layer depth: 1 is furthest back, 4 is closest to the viewer. */
  layer: '1' | '2' | '4';
  src: string;
  /** Empty string is correct for purely decorative layers. */
  alt?: string;
}

export interface ParallaxComponentProps {
  /** Headline rendered on layer 3, between the mid and near image layers. */
  title?: string;
  images?: ParallaxLayerImage[];
  /** Set false when another component on the page already owns smooth scroll. */
  smoothScroll?: boolean;
  className?: string;
}

const DEFAULT_IMAGES: ParallaxLayerImage[] = [
  {
    layer: '1',
    src: 'https://cdn.prod.website-files.com/671752cd4027f01b1b8f1c7f/6717795be09b462b2e8ebf71_osmo-parallax-layer-3.webp',
    alt: '',
  },
  {
    layer: '2',
    src: 'https://cdn.prod.website-files.com/671752cd4027f01b1b8f1c7f/6717795b4d5ac529e7d3a562_osmo-parallax-layer-2.webp',
    alt: '',
  },
  {
    layer: '4',
    src: 'https://cdn.prod.website-files.com/671752cd4027f01b1b8f1c7f/6717795bb5aceca85011ad83_osmo-parallax-layer-1.webp',
    alt: '',
  },
];

/** yPercent travel per layer. Further layers travel more, which reads as depth. */
const LAYER_TRAVEL = [
  { layer: '1', yPercent: 70 },
  { layer: '2', yPercent: 55 },
  { layer: '3', yPercent: 40 },
  { layer: '4', yPercent: 10 },
];

export function ParallaxComponent({
  title = 'Parallax',
  images = DEFAULT_IMAGES,
  smoothScroll = true,
  className,
}: ParallaxComponentProps) {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Honour the OS-level reduced-motion setting: no scrub, no scroll hijack.
    // The layers stay in their resting position and the section reads as a
    // static composition, which is the whole point of the escape hatch.
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const root = parallaxRef.current;
    const triggerElement = root?.querySelector<HTMLElement>('[data-parallax-layers]');

    let tl: gsap.core.Timeline | undefined;

    if (triggerElement) {
      tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerElement,
          start: '0% 0%',
          end: '100% 0%',
          scrub: 0,
        },
      });

      LAYER_TRAVEL.forEach((layerObj, idx) => {
        tl!.to(
          triggerElement.querySelectorAll(`[data-parallax-layer="${layerObj.layer}"]`),
          { yPercent: layerObj.yPercent, ease: 'none' },
          idx === 0 ? undefined : '<',
        );
      });
    }

    // Lenis drives the scroll position; ScrollTrigger has to be told to
    // recompute on its ticks rather than on the native scroll event.
    let lenis: Lenis | undefined;
    let raf: ((time: number) => void) | undefined;

    if (smoothScroll) {
      lenis = new Lenis();
      lenis.on('scroll', ScrollTrigger.update);
      raf = (time: number) => lenis!.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    }

    return () => {
      // Kill only this component's ScrollTrigger. ScrollTrigger.getAll() would
      // take down every other trigger on the page, which breaks sibling
      // components the moment there is more than one on a route.
      tl?.scrollTrigger?.kill();
      tl?.kill();
      if (triggerElement) gsap.killTweensOf(triggerElement.querySelectorAll('[data-parallax-layer]'));
      // gsap.ticker.add() without a matching remove() leaks a callback that
      // keeps running — and keeps a reference to the destroyed Lenis — for the
      // lifetime of the page.
      if (raf) gsap.ticker.remove(raf);
      if (smoothScroll) gsap.ticker.lagSmoothing(500, 33);
      lenis?.destroy();
    };
  }, [smoothScroll]);

  return (
    <div className={className ? `parallax ${className}` : 'parallax'} ref={parallaxRef}>
      <section className="parallax__header">
        <div className="parallax__visuals">
          <div className="parallax__black-line-overflow" />
          <div data-parallax-layers className="parallax__layers">
            {images
              .filter((img) => img.layer === '1' || img.layer === '2')
              .map((img) => (
                <img
                  key={img.layer}
                  src={img.src}
                  loading="eager"
                  width={800}
                  data-parallax-layer={img.layer}
                  alt={img.alt ?? ''}
                  className="parallax__layer-img"
                />
              ))}

            <div data-parallax-layer="3" className="parallax__layer-title">
              <h2 className="parallax__title">{title}</h2>
            </div>

            {images
              .filter((img) => img.layer === '4')
              .map((img) => (
                <img
                  key={img.layer}
                  src={img.src}
                  loading="eager"
                  width={800}
                  data-parallax-layer={img.layer}
                  alt={img.alt ?? ''}
                  className="parallax__layer-img"
                />
              ))}
          </div>
          <div className="parallax__fade" />
        </div>
      </section>

      <section className="parallax__content">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          viewBox="0 0 160 160"
          fill="none"
          className="osmo-icon-svg"
          aria-hidden="true"
        >
          <path
            d="M94.8284 53.8578C92.3086 56.3776 88 54.593 88 51.0294V0H72V59.9999C72 66.6273 66.6274 71.9999 60 71.9999H0V87.9999H51.0294C54.5931 87.9999 56.3777 92.3085 53.8579 94.8283L18.3431 130.343L29.6569 141.657L65.1717 106.142C67.684 103.63 71.9745 105.396 72 108.939V160L88.0001 160L88 99.9999C88 93.3725 93.3726 87.9999 100 87.9999H160V71.9999H108.939C105.407 71.9745 103.64 67.7091 106.12 65.1938L106.142 65.1716L141.657 29.6568L130.343 18.3432L94.8284 53.8578Z"
            fill="currentColor"
          />
        </svg>
      </section>
    </div>
  );
}

export default ParallaxComponent;
