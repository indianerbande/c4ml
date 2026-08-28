export const initialC4mlSource = `c4ml draft-1

// Experimental executable subset; not a public or frozen grammar.

model {
  person caretaker {
    name = "Garden Caretaker"
    responsibility = "Reviews cultivation signals and schedules garden work."
    classification = external
  }

  system garden-pulse {
    name = "Garden Pulse"
    responsibility = "Turns garden observations into a shared work plan."
    classification = internal
  }

  system sensor-post {
    name = "Sensor Post"
    responsibility = "Publishes moisture and temperature observations."
    classification = external
  }
}

relations {
  relation caretaker-reviews-plan {
    from = caretaker
    to = garden-pulse
    intent = "Reviews and adjusts the garden work plan"
  }

  relation sensor-publishes-observations {
    from = sensor-post
    to = garden-pulse
    intent = "Publishes current garden observations"
  }
}

view garden-pulse-context {
  type = system-context
  scope = garden-pulse
  title = "System Context — Garden Pulse"
  purpose = "Introduces Garden Pulse and its immediate operating context."
  audience = default
  legend = generated

  layout {
    flow = right

    corridor lower-entry {
      orientation = vertical
      coordinate = 647
      lanes = 3
      lane-gap = 16
    }

    route caretaker-reviews-plan {
      policy = guided
      style = orthogonal
      source-port = east
      target-port = west
      label-shift = (0, -14)
    }

    route sensor-publishes-observations {
      policy = guided
      style = orthogonal
      source-port = east
      target-port = south
      corridor = lower-entry
      lane = 1
      label-shift = (0, 16)
    }
  }
}
`;
