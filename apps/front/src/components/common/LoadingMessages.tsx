import * as React from 'react'
import { LoadingSpinner } from './LoadingSpinner'

const messages = [
  // Dog-themed messages
  'Our data-sniffing dogs are on the case... 🐕',
  'Our trusty dogs are digging up leads... 🐾',
  'Unleashing our search hounds... 🐕‍🦺',
  'The lead-hunting pack is on the move... 🐺',
  'Our business beagles are following the scent... 🐕',
  'Sending in the retriever squad... 🦮',
  'Our pointer pups are spotting opportunities... 🐕‍🦺',
  'The lead-detection dogs are at work... 🐾',
  'Our canine crew is sniffing success... 🐕',
  'Deploying the business bloodhounds... 🐕',
  'The opportunity-tracking pack is searching... 🐾',
  'Our four-legged scouts are exploring... 🦮',

  // Existing exploration/search messages
  'Detective mode: tracking down your leads... 🔍',
  'Time machine activated: getting fresh data... ⏰',
  'Quality check: making sure businesses are alive and kicking... ✨',
  'Putting together your treasure map of leads... 🗺️',
  'Consulting our crystal ball for insights... 🔮',
  'Summoning the data wizards... 🧙‍♂️',
  'Sending our scouts to your area... 🌟',
  'Magic in progress: processing results... ⚡',
  'Our business compass is pointing the way... 🧭',
  'Diving deep for business pearls... 🤿',

  // New messages
  'Calibrating our business radar... 📡',
  'Exploring the entrepreneurial wilderness... 🗺️',
  'Our lead-finding pigeons are in flight... 🕊️',
  'Decoding the market mysteries... 🔐',
  'Scanning the business horizon... 🔭',
  'Following the trail of opportunities... 👣',
  'Dispatching our network of lead ninjas... 🥷',
  'Mapping the business constellations... ⭐',
  'Unlocking hidden market treasures... 🗝️',
  'Our business sonar is pinging... 🌊',
]

export const LoadingMessages = () => {
  const [messageIndex, setMessageIndex] = React.useState(() =>
    Math.floor(Math.random() * messages.length),
  )

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center justify-center h-full">
      <LoadingSpinner message={messages[messageIndex]} className="text-lg" />
    </div>
  )
}
