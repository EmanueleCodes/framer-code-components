import React, { useCallback, useEffect, useState, ComponentPropsWithRef } from 'react'
import { EmblaOptionsType, EmblaCarouselType } from 'embla-carousel'
import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'

// ============================================================================
// DOT BUTTON NAVIGATION
// ============================================================================

/**
 * Hook to manage dot button navigation state and interactions
 * Tracks the currently selected slide and provides click handlers for dots
 */

type UseDotButtonType = {
	selectedIndex: number
	scrollSnaps: number[]
	onDotButtonClick: (index: number) => void
}

export const useDotButton = (
	emblaApi: EmblaCarouselType | undefined,
	onButtonClick?: (emblaApi: EmblaCarouselType) => void
): UseDotButtonType => {
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

	// Handle dot button clicks - scroll to the selected index
	const onDotButtonClick = useCallback(
		(index: number) => {
			if (!emblaApi) return
			emblaApi.scrollTo(index)
			if (onButtonClick) onButtonClick(emblaApi)
		},
		[emblaApi, onButtonClick]
	)

	// Initialize scroll snap points when carousel is ready
	const onInit = useCallback((emblaApi: EmblaCarouselType) => {
		setScrollSnaps(emblaApi.scrollSnapList())
	}, [])

	// Update selected index when carousel scrolls
	const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
		setSelectedIndex(emblaApi.selectedScrollSnap())
	}, [])

	// Set up event listeners for carousel state changes
	useEffect(() => {
		if (!emblaApi) return

		onInit(emblaApi)
		onSelect(emblaApi)
		emblaApi.on('reInit', onInit).on('reInit', onSelect).on('select', onSelect)
	}, [emblaApi, onInit, onSelect])

	return {
		selectedIndex,
		scrollSnaps,
		onDotButtonClick
	}
}

/**
 * Dot Button Component
 * Renders individual navigation dots
 */

type DotButtonPropType = ComponentPropsWithRef<'button'>

export const DotButton: React.FC<DotButtonPropType> = (props) => {
	const { children, ...restProps } = props

	return (
		<button type="button" {...restProps}>
			{children}
		</button>
	)
}

// ============================================================================
// ARROW BUTTON NAVIGATION
// ============================================================================

/**
 * Hook to manage prev/next arrow button state and interactions
 * Handles button disabled states and click handlers for navigation
 */

type UsePrevNextButtonsType = {
	prevBtnDisabled: boolean
	nextBtnDisabled: boolean
	onPrevButtonClick: () => void
	onNextButtonClick: () => void
}

export const usePrevNextButtons = (
	emblaApi: EmblaCarouselType | undefined,
	onButtonClick?: (emblaApi: EmblaCarouselType) => void
): UsePrevNextButtonsType => {
	const [prevBtnDisabled, setPrevBtnDisabled] = useState(true)
	const [nextBtnDisabled, setNextBtnDisabled] = useState(true)

	// Handle previous button click
	const onPrevButtonClick = useCallback(() => {
		if (!emblaApi) return
		emblaApi.scrollPrev()
		if (onButtonClick) onButtonClick(emblaApi)
	}, [emblaApi, onButtonClick])

	// Handle next button click
	const onNextButtonClick = useCallback(() => {
		if (!emblaApi) return
		emblaApi.scrollNext()
		if (onButtonClick) onButtonClick(emblaApi)
	}, [emblaApi, onButtonClick])

	// Update button disabled states based on scroll position
	const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
		setPrevBtnDisabled(!emblaApi.canScrollPrev())
		setNextBtnDisabled(!emblaApi.canScrollNext())
	}, [])

	// Set up event listeners for carousel state changes
	useEffect(() => {
		if (!emblaApi) return

		onSelect(emblaApi)
		emblaApi.on('reInit', onSelect).on('select', onSelect)
	}, [emblaApi, onSelect])

	return {
		prevBtnDisabled,
		nextBtnDisabled,
		onPrevButtonClick,
		onNextButtonClick
	}
}

/**
 * Previous Arrow Button Component
 * Renders the previous navigation button with left arrow icon
 */

type PrevButtonPropType = ComponentPropsWithRef<'button'>

export const PrevButton: React.FC<PrevButtonPropType> = (props) => {
	const { children, ...restProps } = props

	return (
		<button
			className="embla__button embla__button--prev"
			type="button"
			{...restProps}
		>
			<svg className="embla__button__svg" viewBox="0 0 532 532">
				<path
					fill="currentColor"
					d="M355.66 11.354c13.793-13.805 36.208-13.805 50.001 0 13.785 13.804 13.785 36.238 0 50.034L201.22 266l204.442 204.61c13.785 13.805 13.785 36.239 0 50.044-13.793 13.796-36.208 13.796-50.002 0a5994246.277 5994246.277 0 0 0-229.332-229.454 35.065 35.065 0 0 1-10.326-25.126c0-9.2 3.393-18.26 10.326-25.2C172.192 194.973 332.731 34.31 355.66 11.354Z"
				/>
			</svg>
			{children}
		</button>
	)
}

/**
 * Next Arrow Button Component
 * Renders the next navigation button with right arrow icon
 */

type NextButtonPropType = ComponentPropsWithRef<'button'>

export const NextButton: React.FC<NextButtonPropType> = (props) => {
	const { children, ...restProps } = props

	return (
		<button
			className="embla__button embla__button--next"
			type="button"
			{...restProps}
		>
			<svg className="embla__button__svg" viewBox="0 0 532 532">
				<path
					fill="currentColor"
					d="M176.34 520.646c-13.793 13.805-36.208 13.805-50.001 0-13.785-13.804-13.785-36.238 0-50.034L330.78 266 126.34 61.391c-13.785-13.805-13.785-36.239 0-50.044 13.793-13.796 36.208-13.796 50.002 0 22.928 22.947 206.395 206.507 229.332 229.454a35.065 35.065 0 0 1 10.326 25.126c0 9.2-3.393 18.26-10.326 25.2-45.865 45.901-206.404 206.564-229.332 229.52Z"
				/>
			</svg>
			{children}
		</button>
	)
}

// ============================================================================
// MAIN CAROUSEL COMPONENT
// ============================================================================

/**
 * EmblaCarousel Component
 * Main carousel component with autoplay, dot navigation, and arrow controls
 * 
 * @param slides - Array of slide indices to display
 * @param options - Embla carousel configuration options
 */

type PropType = {
	slides: number[]
	options?: EmblaOptionsType
}

const EmblaCarousel: React.FC<PropType> = (props) => {
	const { slides, options } = props
	
	// Initialize Embla carousel with autoplay plugin
	const [emblaRef, emblaApi] = useEmblaCarousel(options, [Autoplay()])

	// Handle navigation button clicks and autoplay interaction
	const onNavButtonClick = useCallback((emblaApi: EmblaCarouselType) => {
		const autoplay = emblaApi?.plugins()?.autoplay
		if (!autoplay) return

		// Stop or reset autoplay based on configuration
		const resetOrStop =
			autoplay.options.stopOnInteraction === false
				? autoplay.reset
				: autoplay.stop

		resetOrStop()
	}, [])

	// Initialize dot button navigation
	const { selectedIndex, scrollSnaps, onDotButtonClick } = useDotButton(
		emblaApi,
		onNavButtonClick
	)

	// Initialize arrow button navigation
	const {
		prevBtnDisabled,
		nextBtnDisabled,
		onPrevButtonClick,
		onNextButtonClick
	} = usePrevNextButtons(emblaApi, onNavButtonClick)

	return (
		<section className="embla">
			{/* Carousel viewport and slides */}
			<div className="embla__viewport" ref={emblaRef}>
				<div className="embla__container">
					{slides.map((index) => (
						<div className="embla__slide" key={index}>
							<div className="embla__slide__number">{index + 1}</div>
						</div>
					))}
				</div>
			</div>

			{/* Navigation controls */}
			<div className="embla__controls">
				{/* Arrow buttons */}
				<div className="embla__buttons">
					<PrevButton onClick={onPrevButtonClick} disabled={prevBtnDisabled} />
					<NextButton onClick={onNextButtonClick} disabled={nextBtnDisabled} />
				</div>

				{/* Dot navigation */}
				<div className="embla__dots">
					{scrollSnaps.map((_, index) => (
						<DotButton
							key={index}
							onClick={() => onDotButtonClick(index)}
							className={'embla__dot'.concat(
								index === selectedIndex ? ' embla__dot--selected' : ''
							)}
						/>
					))}
				</div>
			</div>
		</section>
	)
}

export default EmblaCarousel
