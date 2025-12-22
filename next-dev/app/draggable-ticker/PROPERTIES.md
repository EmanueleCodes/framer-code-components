Draggable Ticker - Property Controls

Children
Add component instances or layers that will scroll infinitely in the ticker. The ticker will automatically duplicate items to create seamless looping.

Speed
Controls how fast the ticker scrolls. Higher values create faster movement. At 0, the ticker is stationary.

Direction
Sets which direction the ticker scrolls: Left (scrolls right to left), Right (scrolls left to right), Top (scrolls bottom to top), or Bottom (scrolls top to bottom).

Align
Controls how items are aligned within the ticker. For horizontal tickers, this aligns items vertically. For vertical tickers, this aligns items horizontally.

Gap
Sets the spacing between items in the ticker, measured in pixels.

Padding
Controls the padding around the ticker content. Can be set uniformly or individually for each side (Top, Right, Bottom, Left).

Hover
Slows down the ticker speed when you hover over it. Value of 1 means no slowdown, lower values slow it more. Only visible when Draggable is disabled.

Draggable
Enables drag interaction so users can manually scroll the ticker by dragging. When enabled, the ticker responds to mouse and touch gestures.

Momentum
Controls how much momentum the ticker retains after you release a drag. Higher values create longer coasting motion before returning to automatic scrolling. Lower values make it return to base speed more quickly. Only visible when Draggable is enabled.

On Throw
Controls how the ticker behaves after you release a drag. "Follow Drag" continues scrolling in the direction you threw it. "Follow Original" returns to the original Direction setting. Only visible when Draggable is enabled.

Sizing
Controls how child items are sized within the ticker. Width and Height can be set to "Auto" (uses the item's natural size) or "Stretch" (fills available space).

Clipping
Controls the fade effect at the edges of the ticker and how overflow is handled.

Fade
When enabled, creates a gradient fade at the edges of the ticker, making items appear and disappear smoothly.

Overflow
When Fade is disabled, controls whether items that extend beyond the ticker boundaries are visible (Show) or hidden (Hide). Only visible when Fade is disabled.

Width
Controls how wide the fade gradient is at each edge, as a percentage of the ticker size. Higher values create wider fade zones. Only visible when Fade is enabled.

Inset
Pushes the fade gradient inward from the edges, as a percentage. Higher values move the fade effect away from the edges. Only visible when Fade is enabled.

Opacity
Controls the minimum opacity at the fade edges. At 0, edges fade completely to transparent. Higher values keep edges more visible. Only visible when Fade is enabled.

