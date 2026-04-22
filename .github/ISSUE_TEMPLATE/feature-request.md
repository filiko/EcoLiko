name: Feature Request
description: Suggest a new feature or improvement
title: "[Feature] "
labels: ["enhancement"]
body:
  - type: markdown
    attributes:
      value: |
        ## Feature Description
        Describe the feature you'd like. Why would this be useful?

        ## Proposed Solution
        How do you think this should work?

        ## Alternatives Considered
        Any alternative solutions you've considered?

        ## Additional Context
        Screenshots, mockups, or links to related discussions.
  - type: checkboxes
    attributes:
      label: Confirm
      options:
        - label: I have searched existing issues and confirmed this is a new feature request
          required: true
        - label: This aligns with the project's goals (environmental impact tracking)
          required: true