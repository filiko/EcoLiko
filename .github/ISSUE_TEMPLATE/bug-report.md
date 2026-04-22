name: Bug Report
description: Report a bug or unexpected behavior
title: "[Bug] "
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: |
        ## Bug Description
        Describe the bug clearly. What did you expect vs what happened?

        ## Steps to Reproduce
        1.
        2.
        3.

        ## Environment
        - OS: [e.g. macOS 14, Windows 11, Ubuntu 22.04]
        - Node.js version:
        - Package version:

        ## Screenshots/Logs
        Add screenshots or paste relevant logs here.

        ## Additional Context
        Anything else that might be relevant?
  - type: checkboxes
    attributes:
      label: Confirm
      options:
        - label: I have searched existing issues and confirmed this is a new bug
          required: true
        - label: I can reproduce this with the latest version
          required: true