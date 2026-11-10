---
layout: default
author: Jack McKeown
title: Learning Kalman filters by vibe-coding
---

# Learning Kalman filters by vibe-coding

Suppose you're trying to track a moving car, but your GPS is a bit rubbish. You have some idea of where the car should be based on how it was moving, and then the GPS tells you it's somewhere else. Which one should you believe?

A Kalman filter gives you a way to combine these two guesses, taking into account how uncertain each one is. Predict where the car will go, get a measurement, update your estimate, repeat.

That sounds simple enough, but I wanted to get a better feel for what all the matrices were actually doing. So I vibe-coded a little simulator just to teach myself how this stuff works ;).

[Try it here!](https://jackeown.github.io/KalmanFilters/) You can also find [the code on GitHub](https://github.com/jackeown/KalmanFilters).

The simulator has a car going around a track, noisy GPS measurements, and a filter trying to work out the car's position, velocity and acceleration. You can see the real position, the measurements, the prediction and the corrected estimate alongside each other. There are also uncertainty regions around the prediction, so you can see how sure the filter thinks it is.

Try turning up the GPS noise. The measurements scatter further away from the car, and the filter puts less weight on each one. Then try changing the process noise, which represents uncertainty in the motion model. Giving the model more uncertainty lets the measurements pull the estimate around more. You can pause and step through prediction and correction separately, with the matrices there to inspect as you go.

You can also drive the car yourself with the arrow keys, record a drive and replay it through the filter. I like being able to make a turn and then stop to look at what happened. It's much easier to have a question about a particular moment when you can actually poke at it.

One interesting detail: turning the car doesn't automatically make the uncertainty regions turn with it. In this linear model, the covariance update depends on the model and noise matrices, independently of the measured positions. With matching noise and dynamics in both directions, you get circles. You can edit the process noise covariance to make the regions stretch and tilt. Having something to play with makes details like this much less abstract.

I think this is the future of self-guided learning: vibe-coding teaching tools and learning aids tailored to you. You can aim for whatever is optimal for how you learn and the particular thing you're stuck on.

If a formula isn't clicking, make something that shows what happens when you change its inputs. If you want to understand an algorithm, make it stop after every step. If an explanation leaves you wondering "but what happens if...", build a way to try it.

Of course, getting AI to write a simulator doesn't mean you've understood the thing being simulated. You still have to ask questions, check the assumptions and work through why it behaves the way it does. But now you can have a little playground built around exactly those questions, and change it as new ones come up.

I find that pretty exciting. The tool doesn't have to be useful to everyone. It can just be useful to you, for the thing you're trying to understand today.
