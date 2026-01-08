// Email waterfall exports
export {
  runEmailWaterfall,
  runEmailWaterfallWithData,
  type EmailWaterfallContext,
  type EmailWaterfallWithDataContext,
} from '../../../contact/waterfalls/email'

// LinkedIn waterfall exports
export {
  runLinkedInWaterfall,
  type LinkedInWaterfallContext,
  type LinkedInResult as LinkedInWaterfallResult,
} from '../../../contact/waterfalls/linkedin'

// Phone waterfall exports
export {
  runPhoneWaterfall,
  type PhoneWaterfallContext,
  type PhoneWaterfallResult,
} from '../../../contact/waterfalls/phone'
