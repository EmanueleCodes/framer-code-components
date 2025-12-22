# FAME Animation System Documentation

> **FAME (Framer Advanced Motion Engine)** - A high-performance, type-safe animation system for Framer with visual configuration and programmatic API.

## 📖 Documentation Index

### **🚀 Getting Started**
- [**Quick Start Guide**](./01-quick-start.md) - Get FAME running in 5 minutes
- [**Basic Concepts**](./02-basic-concepts.md) - Core animation principles and mental models
- [**Your First Animation**](./03-first-animation.md) - Step-by-step tutorial

### **🎨 User Guides**
- [**Animation Types**](./04-animation-types.md) - Timed, scrubbed, and trigger-based animations
- [**Easing Functions**](./05-easing-functions.md) - Linear, cubic, expo, springs, and custom easings
- [**Property Animation**](./06-property-animation.md) - Transforms, opacity, colors, and more
- [**Advanced Features**](./07-advanced-features.md) - Staggering, loops, and complex behaviors

### **⚙️ Technical Reference**
- [**API Reference**](./08-api-reference.md) - Complete function and interface documentation
- [**Type Definitions**](./09-type-definitions.md) - TypeScript interfaces and types
- [**Configuration Options**](./10-configuration.md) - All available settings and controls

### **🏗️ Architecture & Development**
- [**System Architecture**](./11-architecture.md) - How FAME works under the hood
- [**Component Guide**](./12-components.md) - TimedAnimator, PropertyInterpolator, etc.
- [**Extension Guide**](./13-extensions.md) - Adding new features and properties
- [**Performance Guide**](./14-performance.md) - Optimization and 60fps techniques

### **🔧 Troubleshooting**
- [**Common Issues**](./15-troubleshooting.md) - Solutions to frequent problems
- [**Migration Guide**](./16-migration.md) - Upgrading from previous versions
- [**FAQ**](./17-faq.md) - Frequently asked questions

---

## 🎯 **What is FAME?**

FAME is a **production-ready animation system** that combines the **ease of visual configuration** with the **power of programmatic control**. Built specifically for Framer, it provides:

### **✨ Key Features**
- **🎛️ Visual Configuration** - Configure animations through Framer's property panel
- **⚡ High Performance** - 60fps animations with GPU acceleration
- **🔧 Type Safety** - Full TypeScript support with comprehensive type definitions
- **🎪 Rich Easing Library** - 20+ easing functions including advanced springs
- **🎯 Property Flexibility** - Animate any CSS property with intelligent unit handling
- **🚀 Multiple Triggers** - Load, click, hover, scroll, and custom events
- **⏱️ Advanced Timing** - Per-property duration, delay, and easing control
- **🎨 Staggering System** - Linear and grid-based staggering with multiple modes

### **🧠 Core Philosophy**

FAME follows a **simple mental model**:

```typescript
// Time progresses linearly from 0 to 1
timeProgress: 0.0 → 0.2 → 0.5 → 0.8 → 1.0

// Easing functions transform time into animation curves  
easedProgress: easing(timeProgress) // Can overshoot for springs!

// Properties interpolate using the eased progress
propertyValue: from + (to - from) * easedProgress
```

This separation allows for **predictable timing** with **expressive animation curves**.

---

## 🏃‍♂️ **Quick Example**

```typescript
// Configure a spring animation through Framer's UI
const animationConfig = {
  eventType: "click",
  properties: [{
    property: "translateX", 
    from: "0px",
    to: "300px",
    duration: 2.0, // seconds
    easing: "spring.out",
    springConfig: { amplitude: 2, period: 0.3 }
  }]
};

// FAME handles the rest - 60fps spring with overshoot!
```

---

## 📊 **Current Status**

| Component | Status | Description |
|-----------|--------|-------------|
| **TimedAnimator** | ✅ **Complete** | Core time-based animation engine |
| **Easing System** | ✅ **Complete** | 20+ easing functions with spring support |
| **Property System** | ✅ **Complete** | Type-safe property interpolation |
| **Timing Control** | ✅ **Complete** | Per-property duration and delay |
| **Performance** | ✅ **Complete** | 60fps optimization with frame budgeting |
| **Staggering** | 🚧 **Planned** | Linear and grid staggering |
| **Scroll Animations** | 🚧 **Planned** | Scroll-based triggers and scrubbing |
| **Text Effects** | 🚧 **Planned** | Character and word-level animations |

---

## 🛠️ **For Developers**

### **Architecture Overview**
```
fame-final-repo/src-clean/
├── execution/           # Animation execution engines
│   ├── TimedAnimator.ts    # Core time-based animations
│   └── StyleApplicator.ts  # Property application utilities
├── utils/              # Reusable utilities  
│   ├── easings/           # Easing function library
│   └── properties/        # Property interpolation
├── types/              # TypeScript definitions
└── docs/               # This documentation
```

### **Key Design Principles**
1. **🧩 Modular Architecture** - Each component has a single responsibility
2. **📏 Type Safety** - Comprehensive TypeScript coverage
3. **⚡ Performance First** - Optimized for 60fps with minimal overhead
4. **🎛️ Configuration Driven** - Visual controls map directly to code
5. **🔧 Extensible Design** - Easy to add new properties and behaviors

---

## 🤝 **Contributing**

FAME is actively developed with a focus on **code quality** and **developer experience**:

- **📋 Issues** - Report bugs and request features
- **🔧 Pull Requests** - Contribute improvements and fixes  
- **📚 Documentation** - Help improve these docs
- **🧪 Testing** - Add test cases and examples

---

## 📞 **Support**

- **📖 Documentation** - Start with the [Quick Start Guide](./01-quick-start.md)
- **❓ FAQ** - Check the [Frequently Asked Questions](./17-faq.md)
- **🐛 Issues** - Report bugs with detailed reproduction steps
- **💬 Discussions** - Ask questions and share examples

---

**Ready to start?** → [**Quick Start Guide**](./01-quick-start.md) 