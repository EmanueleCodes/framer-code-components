# Computing a 2D Rotation Angle Around an Arbitrary Axis

This document explains how to compute a **2D rotation angle for each point** when a shape rotates around an **arbitrary direction** `s`, generalizing the simple case of rotation around a coordinate axis (e.g. the y-axis).

---

## 1. Simple Case: Rotation Around the Y Axis

When rotation is only around the **y-axis**, each point rotates in the **x–z plane**.

For a point  
\[
p = (x, y, z)
\]

The rotation angle is:
\[
\theta = \operatorname{atan2}(z, x)
\]

Why this works:
- The rotation axis is fixed (y)
- The perpendicular plane is known (x–z)
- `atan2` directly gives a signed angle

---

## 2. General Case: Rotation Around an Arbitrary Direction `s`

Let:
- `s` = rotation axis (3D vector)
- `p` = point position **relative to the rotation center**

### Key idea

To compute a **2D angle**, you must:
1. Project the point onto the plane **perpendicular** to the rotation axis
2. Measure the angle **inside that plane**

Angles are always defined in a plane — this step is unavoidable.

---

## 3. Step-by-Step Method (No Rotation Matrices Required)

### Step 1: Normalize the rotation axis

\[
\hat{s} = \frac{s}{\|s\|}
\]

---

### Step 2: Project the point onto the perpendicular plane

Remove the component of `p` along the axis:

\[
p_\perp = p - (p \cdot \hat{s})\hat{s}
\]

Now `p_perp` lies entirely in the rotation plane.

---

### Step 3: Build a 2D coordinate system in that plane

Choose any vector **not parallel** to `s`, for example:

\[
r_0 = (1, 0, 0)
\]

Make it perpendicular to the axis:

\[
u = r_0 - (r_0 \cdot \hat{s})\hat{s}
\]
\[
\hat{u} = \frac{u}{\|u\|}
\]

Define the second basis vector:

\[
\hat{v} = \hat{s} \times \hat{u}
\]

Now `(û, v̂)` form an **orthonormal 2D basis** in the rotation plane.

---

### Step 4: Compute the angle

Project `p_perp` into the 2D basis:

\[
x' = p_\perp \cdot \hat{u}
\]
\[
y' = p_\perp \cdot \hat{v}
\]

The rotation angle is:

\[
\boxed{
\theta = \operatorname{atan2}(y', x')
}
\]

This gives:
- A signed angle
- One angle per point
- A consistent parameterization around the axis `s`

---

## 4. Relation to Rotation Matrices

You **do not have to use rotation matrices**, but this method is mathematically equivalent.

If you construct a matrix whose columns are:

\[
(\hat{u}, \hat{v}, \hat{s})
\]

and transform points into that coordinate system, then the angle is simply:

\[
\theta = \operatorname{atan2}(y, x)
\]

### Interpretation

- Projection + dot products → conceptual clarity
- Rotation matrices → computational convenience

Both approaches use the same geometry.

---

## 5. Summary

| Case | Recommended Method |
|----|----|
| Axis = x, y, or z | `atan2` in the perpendicular plane |
| Arbitrary axis `s` | Projection → local 2D basis → `atan2` |
| Many points | Precompute basis or use a matrix |
| Learning / debugging | Projection method |

---

## 6. Key Takeaway

To compute a rotation angle around an arbitrary direction:

> **Project → define a plane → measure the angle**

That is the geometric core of axis-angle rotation.
