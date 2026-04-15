



## Product Requirements Document
## Driif - Nexus
## Ashita Agrawal
[Email address]

Driif.ai [Type here] [Type here]
## 1
1 Table of Contents
## Product Requirements Document 0
Product Requirements Document (PRD) 5
Counter-Unmanned Aerial System (C-UAS) Command & Control Platform 5
## 1. Objective 5
## 2. System Operational Flow 5
- Area of Operation (AOP) 6
## 4. Command / Company Level Configuration 6
## 4.1. Fence Configuration 6
## 4.2. Alert Configuration 6
## 4.3. Escalation Matrix 7
## 4.4. Radar Inventory 7
## 5. Drone Intelligence Library 8
## 6. Radar Configuration 8
## 7. Operational Zones 10
## Detection Zone 10
## Jamming Zone 10
## 8. Fence Management 10
## Fence Types 10
## Border Fence 10
## Threat Zone 10
Area of Operation 11
## 9. Alert System 11
## Critical Alerts 11
## Medium Alerts 11
## 10. Mission Configuration 12
## Radar Assignment 12
Fence and Zone Setup 12
## Radar Detection Modes 12
## 11. Jamming Modes 12
## Auto Track & Jam 13
## Manual Mode 13
## Hybrid Mode 13

Driif.ai [Type here] [Type here]
## 2
## 12. Handling Unidentified Objects 13
## 12.1. Object Detection 13
## 12.2. Path Tracking 14
## 12.3. Automatic Object Naming 14
12.4. Threat Scoring (AI/ML) 14
## 12.5. Enemy Drone Heatmap 15
12.6. Multi-Drone Scenario 15
## 12.7. Object Information Display 16
## Minimal View 16
## Detailed View 16
## 12.8. Object Logs 16
## 12.9. Speed Change Monitoring 17
12.10. Mission-Level Object Counter 17
## 12.11. Jam Command Failure Handling 17
## 12.12. Drone Off Radar Handling 17
- Mission Logs and Audit 18
- Main UI Dashboard 18
## 15. Drone Swarm Detection 19
## 15.1. Objective 19
## 15.2. Scope 19
## 15.3. System Inputs 20
## Sensor Inputs 20
## Track Data 20
## 15.4. Swarm Detection Criteria 20
## 15.4.1. Object Density Detection 21
## 15.4.2. Spatial Clustering 21
## 15.4.3. Movement Synchronization 21
## 15.4.4. Entry Pattern Analysis 22
15.4.5. RF Signature Correlation 22
## 15.4.6. Behavior Pattern Recognition 23
## 15.4.7. Temporal Correlation 23
## 15.5. Swarm Probability Score 23
## Scoring Model 23

Driif.ai [Type here] [Type here]
## 3
## 15.6. Swarm Classification 24
Swarm Types to be displayed on UI 24
## 15.7. Swarm Visualization 24
UI Features 24
15.8. Alerts – to be synched with all other alerts 24
## Critical Alert 25
## Medium Alert 25
## 15.9. Swarm Countermeasure Recommendations 25
## 15.10. Mission Integration 25
15.11. Logs and Analytics 26
- Autonomous threat prioritization 26
## 16.1. Objective 26
## 16.2. System Context 27
## 16.3. Data Inputs 27
16.3.1. Real-Time Sensor Inputs 27
## 16.3.2. Kinematic Inputs 28
16.3.3. Multi-Drone Group Inputs 28
## 16.3.4. Geospatial Context Inputs 28
## 16.3.5. Historical Activity Inputs 29
## 16.4. Feature Engineering 29
## Movement Behavior Features 29
## Speed Behavior Features 29
## Group Behavior Features 30
## Contextual Risk Features 30
## 16.5. Model Architecture 30
16.6. AI Outputs – To be considered by UX 33
## Threat Score 33
## Intent Label 34
## Predicted Target 34
## Predicted Path 34
## Suspected Launch Zone 34
## Historical Context 34
16.7. Operator Recommendation Engine – For UX 35
16.8. UI Fields - COnsolidated 35
16.9. Map Visualization – for UX 36

Driif.ai [Type here] [Type here]
## 4
## 16.10. Alert Triggers 36
## 16.11. Performance Requirements 36
## 16.12. Explainability Requirements 37
## 16.13. Data Logging 37
- Statistics Error! Bookmark not defined.
17.1. Performance Requirements from swram 46
17.2. Daily activity 46



Driif.ai [Type here] [Type here]
## 5


Product Requirements Document (PRD)
Counter-Unmanned Aerial System (C-UAS)
## Command & Control Platform

## 1. Objective
Develop a Unified Counter-UAS Command & Control platform that integrates multiple
radars, sensors, and jamming systems into a single operational interface.
The system should:
- Display all radars and third-party detected objects on a single map
- Provide real-time detection and tracking of drones
- Allow operators to identify, assess, and neutralize threats
- Provide automatic or manual jamming capabilities
- Simulate real defense scenarios for GUI demonstration and operator training
The goal is to allow operators to make decisions seamlessly under real-time conditions.

## 2. System Operational Flow
Mission setup workflow:
Define Area of Operation (AOP)
## ↓
Configure radar positions
## ↓
Run radar health checks
## ↓
Compute detection coverage
## ↓
Identify blackout zones
## ↓

Driif.ai [Type here] [Type here]
## 6
Start mission monitoring

- Area of Operation (AOP)
The Area of Operation defines the geographical mission boundary.
## Capabilities:
- Define using polygon coordinates or circle
- Display boundary on operational map
- Validate that radar coverage spans the entire AOP
- Automatically identify coverage gaps / blackout zones – Driif specific feature

## 4. Command / Company Level Configuration
These configurations apply to all missions operating under a command unit.

## 4.1. Fence Configuration
Define types of fences and corresponding colors.
## Fence Type Purpose Example Color
Border National border / no-cross line Red
Threat Zone Sensitive installations Orange
Area of Operation Mission area Blue

## 4.2. Alert Configuration
Each alert type must define:
- Alert color
- Sound / buzzer trigger
- Severity level

Driif.ai [Type here] [Type here]
## 7
- Escalation rule
## Example:
## Alert Level Color Sound
Critical Red Buzzer + voice
Medium Orange Alert tone
## Information Blue Silent
Example alert:
## BLUE CODE RAISED

## 4.3. Escalation Matrix
Alert escalation path:
## Operator
## → Radar Control Officer
## → Command Center
## → Defense Headquarters
Each authority must store:
## • Name
## • Role
- Contact number
- Secure communication channel

## 4.4. Radar Inventory
Each radar must include:
- Radar ID
- Location coordinates
- Detection range
- Jamming range
- Number of jammers
- Frequency coverage
- Operational status

Driif.ai [Type here] [Type here]
## 8

## 5. Drone Intelligence Library
The Drone Library maintains information about known drone types.
Parameters stored:
## Parameter Description
Manufacturer Drone make
Model Drone model
Frequency RF communication band
Altitude Operational ceiling
Speed Speed range
## Capabilities:
- Import drone intelligence databases
- Add new drone models manually
- Match detected objects against library entries
- Provide classification probabilities
Future enhancement:
- Enemy drone database integration

## 6. Radar Configuration
Radar parameters must support configuration during setup or mission initialization.
## Parameters:
## Parameter Description
## Detection
frequencies
RF bands monitored. There are multiple bands possible eg
## Jamming
frequencies
Frequency bands that can be jammed

Driif.ai [Type here] [Type here]
## 9
## Parameter Description
Power jammers
Number of jammer power amplifiers – each jammer works on some set of
frequencies
Mount angle Orientation
Mount height Physical installation height







Driif.ai [Type here] [Type here]
## 10
## 7. Operational Zones
## 1.1.1 Detection Zone
## Characteristics:
- Always 360° coverage
- Larger than jamming zone
- Limited by altitude threshold
Objects above detection altitude are not detected.

## 1.1.2 Jamming Zone
## Characteristics:
- Smaller radius
- Jamming can be directional or omnidirectional

## 8. Fence Management
Operators can create fences for operational awareness.

## 1.1.3 Fence Types
## Border Fence
Defined by lat-long line points.
## Characteristics:
- May be a line (not polygon)
- Always visible on UI

## Threat Zone

Driif.ai [Type here] [Type here]
## 11
Sensitive area where drone presence triggers alerts.

Area of Operation
Defines mission operational area.

## 9. Alert System

## 1.1.4 Critical Alerts
Triggered immediately.
## Examples:
- Radar detector failure
- Jammer amplifier failure
- Object entering threat zone
- Multiple drones detected
- Friendly drone detected during jamming
## Example:
## CRITICAL ALERT
MULTIPLE DRONES DETECTED – direction
Future capability:
- Voice alert system

## 1.1.5 Medium Alerts
## Examples:
- Object leaving detection zone
- Object approaching border
- Object entering another AOP
- Speed anomaly detected

Driif.ai [Type here] [Type here]
## 12

## 10. Mission Configuration
Mission setup defines operational parameters.

## 1.1.6 Radar Assignment
Operator selects radars participating in mission.

1.1.7 Fence and Zone Setup
Operators may:
- Create new fences
- Use predefined fences

## 1.1.8 Radar Detection Modes
Detection modes can be applied per radar or mission level.
## Modes:
## Mode Description
Parsing Spectrum Detect all RF frequencies
Library Spectrum Detect drones from library
Blend Mode Detect both
Frequency Band Scan Scan specific bands
Combined Mode Multi-mode detection

## 11. Jamming Modes


Driif.ai [Type here] [Type here]
## 13
## 1.1.9 Auto Track & Jam
## Workflow:
- Object enters jamming zone
- Software sends jamming command automatically
- Jamming direction determined by radar angle
## Note:
This functionality must be implemented at the software layer.

## 1.1.10 Manual Mode
Operator manually approves jamming.
## Steps:
- Alert triggered
- Operator confirms
- System auto-populates angle and direction

## 1.1.11 Hybrid Mode
Operator tracks drone manually but enables auto-jamming trigger when drone enters jamming
zone.

## 12. Handling Unidentified Objects
When a detected object cannot be matched with the drone library, the system creates an
unidentified drone track.

## 12.1. Object Detection
System actions:

Driif.ai [Type here] [Type here]
## 14
- Generate track ID
- Begin continuous tracking
- Display object on operational map
- Classify the drone as Friendly or  Foe

## 12.2. Path Tracking
System records the flight path of the object.
UI behavior:
- Display trajectory line
- Show entry point into detection zone
- Maintain full path history

## 12.3. Automatic Object Naming
If unidentified, system generates object name:
<First 3 letters of Mission>-YY-MM-DD-001
## Example:
## DEL-26-03-001
Operators may rename the object.

12.4. Threat Scoring (AI/ML)
System calculates Threat Probability Score based on:
## Parameter Description
Drone signature RF similarity
Flight path Behavioral pattern
Altitude Mission pattern

Driif.ai [Type here] [Type here]
## 15
## Parameter Description
Speed Drone type estimation
Time of operation Suspicious timing
Movement behavior Surveillance / attack
Example UI:
## Threat Probability: 82%
## Possible Type: Surveillance Drone

If not a known object automatically classify as enemy and provide the ability
to the operator to change to friendly or unknown

## 12.5. Enemy Drone Heatmap
UI displays heatmaps indicating:
- Historical drone entry routes
- High-risk approach corridors
- Enemy drone activity zones

12.6. Multi-Drone Scenario
If multiple unidentified drones are detected and the mission is not in Auto Track & Jam mode,
the system recommends activation.
Example UI message:
Multiple unidentified drones detected
## Recommendation: Enable Auto Track & Jam
Operator actions:
## Enable Auto Jam
## Track Manually
## Ignore


Driif.ai [Type here] [Type here]
## 16
## 12.7. Object Information Display
Operators can toggle between two levels of detail.
## Minimal View
## Displays:
- Object ID
## • Speed
## • Altitude
## • Direction
- Threat score

## Detailed View
## Displays:
- Drone classification probability
- RF frequency
- Radar detecting object
- Path history
- Threat zone proximity

## 12.8. Object Logs
Events must be logged at both object and mission levels.
## Examples:
Object detected
Object classified
Object entered threat zone
Speed change detected
Jamming initiated
Object lost


Driif.ai [Type here] [Type here]
## 17
## 12.9. Speed Change Monitoring
System monitors velocity changes continuously.
If abnormal speed detected:
Speed anomaly detected

12.10. Mission-Level Object Counter
Mission dashboard must show:
Active drones detected
Threat objects
Neutralized objects
## Example:
## Active Drones: 3
Threat Level: HIGH

## 12.11. Jam Command Failure Handling
If jamming command fails:
Jamming command failed
Possible jammer gimbal malfunction
Operator actions:
## Restart Jammer
## Retry Command
Escalate to Maintenance

## 12.12. Drone Off Radar Handling
If drone disappears after jamming:
## STATUS: OFF RADAR

Driif.ai [Type here] [Type here]
## 18
The system must retain:
- Last known position
- Final trajectory
- Jamming logs

- Mission Logs and Audit
Logs must be maintained for:
- Radar health
- Alerts generated
- Jamming actions
- Operator decisions
Logs should be accessible at:
- Object level
- Mission level
- Command level

- Main UI Dashboard
The primary interface must display:
- All radars
- Detection zones
- Jamming zones
- Operational fences
- Drone objects
- Flight paths
## • Alerts
Dashboard counters:
Active drones
Threat objects
Radars online
Radars offline
Jammers active

Driif.ai [Type here] [Type here]
## 19


## 15. Drone Swarm Detection
## 15.1. Objective
Develop a Drone Swarm Detection and Identification module within the C-UAS platform that
can:
- Detect multiple drones operating in coordination
- Differentiate between independent drones and coordinated swarm behavior
- Provide real-time swarm alerts
- Predict swarm trajectory and target
- Enable automated countermeasures such as jamming
The system must work with data from:
- Radar sensors
- RF detectors
- EO/IR cameras
- Drone intelligence library
The module should provide early swarm detection to allow commanders sufficient reaction
time.

## 15.2.  Scope
The Swarm Detection module will:
- Identify multiple drone objects detected within a region – show them visually
- Analyze coordination patterns
- Calculate swarm probability
- Visualize swarm clusters on the map
- Trigger swarm alerts and recommended counter actions


Driif.ai [Type here] [Type here]
## 20
## 15.3. System Inputs
The swarm detection system will consume data from existing modules.
## 1.1.12 Sensor Inputs
## Sensor Data Provided
Radar Position, altitude, speed
RF detector Frequency and communication signal
EO/IR Visual object classification in later phases
Acoustic sensor Rotor signature in later phases

## 1.1.13 Track Data
Each detected object track includes:
## Parameter Description
Track ID Unique object identifier
Latitude Current position
Longitude Current position
Altitude Current flight altitude
Speed Current velocity
Heading Movement direction
Radar Source Sensor detecting object
Model From drone library
manufacturer From drone library
RF frequencies From drone library
Flight Characteristics From drone library


## 15.4. Swarm Detection Criteria
A swarm is detected when multiple drones exhibit coordinated behavior.
The system must evaluate several indicators.


Driif.ai [Type here] [Type here]
## 21
## 15.4.1. Object Density Detection
Detect clusters of drones in a region.
## Thresholds:
## Condition Threshold
Multiple drones ≥ 3 drones
Possible swarm ≥ 5 drones
Confirmed swarm ≥ 8 drones
These thresholds must be configurable.

## 15.4.2. Spatial Clustering
Detect drones flying within a defined spatial proximity.
## Parameters:
- Maximum cluster radius
- Minimum number of drones in cluster
## Example:
Cluster radius: 500 meters
Minimum cluster size: 5 drones
Algorithms used:
- Density clustering
- Spatial grouping

## 15.4.3. Movement Synchronization
Detect synchronized flight patterns.
Parameters evaluated:
## Parameter Condition
Speed similarity Speed variance below threshold

Driif.ai [Type here] [Type here]
## 22
## Parameter Condition
Heading similarity Same directional vector
Acceleration Simultaneous speed changes
Altitude band Same altitude range
## Example:
Drone A: 45 km/h
Drone B: 46 km/h
Drone C: 44 km/h

## 15.4.4. Entry Pattern Analysis
Detect coordinated entry patterns.
Patterns include:
- Simultaneous entry
- Sequential entry
- Multi-direction convergence
Example pattern:
3 drone groups entering AOP from 3 directions

15.4.5. RF Signature Correlation
Detect similar communication signals between drones.
Parameters analyzed:
- Control frequency
- Signal modulation
- Packet intervals
- RF fingerprint
## Example:
2.4 GHz control
Identical packet timing


Driif.ai [Type here] [Type here]
## 23
## 15.4.6. Behavior Pattern Recognition
AI models analyze flight behavior. This should be displayed on UI
Recognized swarm behaviors:
## Pattern Description
Surveillance Circular orbit
Search Grid scanning
Attack Converging flight
Decoy Random motion

## 15.4.7. Temporal Correlation
Evaluate time difference between drone detections.
## Example:
Drone detected at T0
Second drone at T0 + 3 seconds
Third drone at T0 + 6 seconds
Short time intervals suggest coordinated launch.

## 15.5. Swarm Probability Score
The system calculates a Swarm Probability Score. This will not be displayed on UI
## Scoring Model
## Factor Weight
Drone count 25%
Movement synchronization 20%
RF similarity 15%
Formation structure 15%
Entry pattern 15%
Behavior classification 10%

Driif.ai [Type here] [Type here]
## 24
Example output:
## Swarm Probability: 87%
## Swarm Type: Coordinated Attack
## Threat Level: Critical

## 15.6. Swarm Classification
The system should classify swarm intent.
1.1.14 Swarm Types to be displayed on UI
## Type Description
Surveillance swarm Observation and reconnaissance
Search swarm Area scanning
Attack swarm Converging toward target
Decoy swarm Distracting defense systems

## 15.7. Swarm Visualization
The C-UAS UI must visualize swarms clearly.
1.1.15 UI Features
- Swarm cluster circle
- Individual drone tracks
- Swarm center marker
- Swarm trajectory prediction
Example display:
## SWARM DETECTED
Cluster size: 12 drones
Cluster speed: 52 km/h
Cluster heading: 210°

15.8. Alerts – to be synched with all other alerts
Swarm alerts must be categorized.

Driif.ai [Type here] [Type here]
## 25
## 1.1.16 Critical Alert
Triggered when swarm probability exceeds threshold.
## Example:
## CRITICAL ALERT
Drone swarm detected
Cluster size: 10 drones

## 1.1.17 Medium Alert
Triggered when swarm probability is moderate.
## Example:
Warning: Possible drone swarm forming

## 15.9. Swarm Countermeasure Recommendations
The system should recommend actions.
## Examples:
## Condition Recommended Action
Small swarm Directional jamming
Medium swarm Multi-radar tracking
Large swarm Activate automated jamming
Example UI:
## Recommended Action:
## Enable Auto Track & Jam

## 15.10. Mission Integration
The swarm detection module integrates with mission settings.
## Capabilities:

Driif.ai [Type here] [Type here]
## 26
- Auto activate Auto Track & Jam
- Assign multiple radars for tracking
- Prioritize swarm targets

15.11. Logs and Analytics
Events must be logged.
## Examples:
Swarm detected
Cluster formed
Swarm classification updated
Countermeasure activated
Swarm dispersed
Logs available at:
- Object level
- Cluster level
- Mission level

- Autonomous threat prioritization
## 16.1. Objective
Develop an AI system that:
- Identifies the threat level of detected drones or drone groups.
- Infers intent based on behavioral patterns.
- Predicts future trajectory and potential targets.
- Identifies potential launch/origin zones.
- Correlates current events with historical activity in the same area.
- Provides operator recommendations for response actions.
This engine supports counter-drone situational awareness and decision support.


Driif.ai [Type here] [Type here]
## 27
## 16.2. System Context
Inputs will be received from:
- Radar tracks
- RF detection sensors
- EO/IR visual sensors
- Drone telemetry (if available)
- Historical surveillance data
- Geospatial context layers
Outputs will be shown in:
- CUAS operator console
- Tactical map view
- Alert panel
- Track detail panel

## 16.3. Data Inputs
16.3.1. Real-Time Sensor Inputs
## Radar
- Track ID
## • Range
## • Azimuth
## • Elevation
## • Velocity
## • Heading
## • Acceleration
- Radar cross section (RCS)
- Track age
- Track confidence
RF Sensors
- RF fingerprint
- Protocol family
- Frequency band
- Signal strength
- Device classification probability

Driif.ai [Type here] [Type here]
## 28
EO/IR Sensors
- Object detection bounding box
- Object classification confidence
- Estimated size
- Visual motion tracking data

## 16.3.2. Kinematic Inputs
Derived from trajectory tracking. All these parameters are required to be observed for the
particular area
- Speed – note this would vary from region to region
- Acceleration – note this would vary from region to region
- Heading change rate – note this would vary from region to region
- Altitude – This could differ in each area but still in general could be taken
- Climb/descent rate
- Turn frequency
- Hover duration
- Path curvature
- Time in monitored zone

16.3.3. Multi-Drone Group Inputs
Used for swarm detection.
- Number of drones in cluster
- Inter-drone distance
- Speed synchronization
- Heading alignment
- Convergence/divergence patterns
- Leader-follower behavior detection

## 16.3.4. Geospatial Context Inputs
- Distance to protected asset
- Distance to perimeter boundary
- Terrain elevation
- Known no-fly zones

Driif.ai [Type here] [Type here]
## 29
- Radar blind spots
- Likely launch areas
o open ground
o rooftops
o road access
- historical drone activity grid heatmap

## 16.3.5. Historical Activity Inputs
From event database.
- Prior drone sightings in same grid
- Frequency of sightings
- Repeated trajectory patterns
- Time-of-day recurrence
- Previous inspection-like behavior
- Past swarm activity in area

## 16.4. Feature Engineering
The AI engine computes derived features.
## 1.1.18 Movement Behavior Features
- Directness to protected asset
- Orbit/loiter detection
- Perimeter tracing behavior
- Hover count
- Path irregularity score
- Boundary inspection pattern score
## 1.1.19 Speed Behavior Features
- Speed deviation from civilian norms
- Rapid acceleration patterns
- Hover → rapid approach pattern
- Coordinated swarm speed patterns

Driif.ai [Type here] [Type here]
## 30
## 1.1.20 Group Behavior Features
- Swarm cluster confidence
- Leader node probability
- Coordinated trajectory score
- Multi-drone convergence index
## 1.1.21 Contextual Risk Features
- proximity risk score
- blind spot exploitation score
- launch feasibility score
- historical anomaly score

## 16.5. Model Architecture
The AI system uses a layered model architecture.

1.1.21.1 Layer 1: Track-Level Behavior Model
## Purpose:
Classify individual drone behavior.
Model types:
- Gradient boosting – this will be used for anomaly detection, behavior classification and
threat score
- Random forest – We will be using multiple decision tress to come up with the best
decision on threat, behavior and threat score
- Temporal neural networks (LSTM / transformer) –
 Smooth trajectories
 Repeated patterns
 Short-to-medium time dependencies
LSTM can detect:
 Loitering patterns
 Perimeter tracing
 Hover → move → hover behavior

Driif.ai [Type here] [Type here]
## 31
 Repeated inspection loops
Outputs - UX:
- behavior class
- anomaly score
- Threat score
Behavior classes include:
- transit
- loiter
- perimeter inspection
- mapping pattern
- direct inbound approach
- unknown anomalous movement

Layer 2: Multi-Drone Behavior Model
## Purpose:
Detect swarm or coordinated activity.
## Methods:
- clustering algorithms
- graph neural networks
- trajectory correlation models
## Outputs:
- swarm probability
- leader-follower probability
- coordinated attack likelihood

## Layer 3: Historical Pattern Correlation
## Purpose:
Compare current movement with past drone activity.
## Techniques:
- spatiotemporal clustering

Driif.ai [Type here] [Type here]
## 32
- trajectory similarity analysis
- heatmap recurrence scoring
## Outputs:
- historical similarity score
- repeated inspection probability
- recurring corridor probability

## Layer 4: Threat Scoring Engine
A weighted scoring system combines outputs.
Example weights:
## Factor Weight
Path behavior 30%
Group coordination 20%
Historical activity 20%
Proximity to asset 15%
## Speed/kinematics 10%
Sensor classification 5%
Threat score range:
Score Classification - UX
0–25 benign
26–50 suspicious
51–75 hostile probable
76–100 hostile high confidence


Driif.ai [Type here] [Type here]
## 33
## Layer 5: Path Prediction Model
Predicts likely movement.
## Methods:
- trajectory forecasting models
- Kalman filtering
- transformer trajectory models
Outputs for UX:
- predicted path
- predicted target zone
- predicted time-to-impact

## Layer 6: Launch Origin Estimation
AI estimates likely origin using:
- reverse trajectory extrapolation
- terrain feasibility
- historical launch clusters
- RF signal direction
Output - UX:
- probable launch grid
- confidence score

16.6. AI Outputs – To be considered by UX
For each track the system generates:
## 16.6.1. Threat Score
Numerical score 0–100.

Driif.ai [Type here] [Type here]
## 34
## 1.1.22 Intent Label
Possible labels:
- transit
- reconnaissance
- perimeter inspection
- mapping mission
- swarm coordination
- attack approach
- unknown anomalous behavior

## 16.6.2. Predicted Target
Predicted location or asset likely to be approached.

## 16.6.3. Predicted Path
Future trajectory estimate.

## 16.6.4. Suspected Launch Zone
Most probable origin grid.

## 16.6.5. Historical Context
Summary of prior activity in the same area.
## Example:
Similar flight pattern detected twice in the past 7 days in the same sector.


Driif.ai [Type here] [Type here]
## 35
16.7. Operator Recommendation Engine – For UX
The system generates recommended actions.
## Examples:
- Continue monitoring
- Assign EO camera for confirmation
- Raise alert level
- Prepare RF jamming
- Deploy interceptor UAV
Recommendations must include:
- reason
- confidence level

16.8. UI Fields - COnsolidated
Displayed in Track Detail Panel.
## Field Description
Track ID Unique identifier
Threat Score Numeric risk score
Intent AI predicted mission type
Group Status Single / swarm detected
Predicted Target Most likely asset/sector
Predicted Path Future trajectory overlay
Launch Zone Suspected origin grid
Historical Context Prior activity summary
Recommendation Suggested operator action

Driif.ai [Type here] [Type here]
## 36

16.9. Map Visualization – for UX
The UI must display:
- current drone path
- predicted path
- historical drone heatmap
- suspected origin zone
- protected asset zones
- swarm cluster visualization

## 16.10. Alert Triggers
Alerts generated when:
- threat score > threshold
- drone approaches restricted perimeter
- swarm detected
- historical reconnaissance pattern detected
- predicted path intersects protected asset
Provide the ability to mark false alert and the system should be able to take this input for
retraining purposes

## 16.11. Performance Requirements
Target system performance:
- threat inference latency < 2 seconds
- path prediction update every 1 second
- swarm detection within 3 seconds
- historical pattern lookup < 1 second


Driif.ai [Type here] [Type here]
## 37
## 16.12.  Explainability Requirements
For every AI decision, the system must show reason codes.
## Example:
Threat score increased due to:
- repeated perimeter tracing behavior
- swarm coordination detected
- historical inspection pattern in same sector
- proximity to protected asset

## 16.13. Data Logging
System must log in database
- sensor inputs
- model outputs
- threat score evolution
- operator decisions
- final engagement outcome
This data will be used for model retraining.
- Area of threat Identification
## 1.1.22.1 Scope
## Included
- Real-time threat heatmap generation
- Spatial clustering of drone activity
- Historical pattern correlation
- Area-level threat scoring
- Future risk prediction (short horizon)
- Launch zone estimation
Excluded (Phase 1)
- Fully autonomous engagement actions

Driif.ai [Type here] [Type here]
## 38
- Long-term strategic forecasting (>24 hrs)
- Cross-region intelligence sharing
17.1. Real-Time Inputs
From sensors:
- Drone track positions (lat/long)
- Speed, heading, altitude
- Track confidence
- Multi-drone clusters

## 17.2. Historical Inputs
From event store:
- Past drone detections (geo + timestamp)
- Frequency of sightings per area
- Repeated trajectory patterns
- Time-of-day recurrence
- Prior swarm events
- Inspection-like behavior history

## 17.3. Geospatial Context Inputs
- Protected asset locations
- Restricted zones
- Terrain data
- Radar blind spots
- Open launch-friendly areas
- Road/access networks


Driif.ai [Type here] [Type here]
## 39
## 17.4. Sensor Fusion Inputs
- Radar detections
- RF signal density
- EO/IR confirmations
- Acoustic detections (optional)

## 17.5. Data Processing

## ▪ Spatial Grid Generation
- Divide operational map into grid cells
## • Default: 100m × 100m (configurable)
- Support adaptive grid for high-density zones

▪ Feature Computation per Grid
## Activity Features
- drone count (last X minutes)
- dwell time
- hover frequency
- entry/exit count
## Pattern Features
- perimeter tracing frequency
- circular/loiter behavior
- repeated visits
- corridor usage
## Movement Features
- average speed
- acceleration anomalies
- convergence/divergence score

Driif.ai [Type here] [Type here]
## 40
## Historical Features
- sightings (24h / 7d / 30d)
- recurrence score
- anomaly vs baseline
## Context Features
- proximity to protected asset
- overlap with restricted zones
- blind spot proximity
- launch feasibility score

## 17.6. Model Architecture

## ▪ Spatial Clustering Layer
Purpose: Detect activity clusters
## Algorithms:
## • DBSCAN / HDBSCAN
## Outputs:
- cluster boundaries (polygons)
- swarm zones

## ▪ Density Estimation Layer
Purpose: Generate continuous threat intensity
## Method:
- Kernel Density Estimation (KDE)
## Outputs:

Driif.ai [Type here] [Type here]
## 41
- heatmap values

## ▪ Area Threat Scoring Model
Purpose: Assign risk score per grid
## Models:
## • Gradient Boosting / Random Forest
## Output:
- threat score (0–100 per grid cell)

## ▪ Temporal Prediction Layer
Purpose: Predict evolution of threat areas
## Models:
- LSTM / Transformer
## Outputs:
- predicted hotspot expansion
- future high-risk zones

## ▪ Launch Zone Estimation Layer
Purpose: Identify probable drone origin
## Methods:
- reverse trajectory analysis
- path clustering
- terrain feasibility scoring
## Outputs:

Driif.ai [Type here] [Type here]
## 42
- probable launch zones
- confidence score

## ▪ Threat Scoring Logic
Each grid cell is assigned a score:
## Factor Weight
Recent activity density 25%
Repeated activity 20%
Behavioral anomaly 20%
Proximity to asset 15%
Swarm activity 10%
Launch feasibility 10%

## ▪ Threat Levels
## Score Level
## 0–25 Low
## 26–50 Moderate
## 51–75 High
## 76–100 Critical

## ▪ Outputs


Driif.ai [Type here] [Type here]
## 43
▪ Area-Level Outputs
For each grid/zone:
## • Threat Score
## • Threat Level
## • Activity Density
## • Historical Activity Score
- Swarm Presence (Yes/No)
## • Predicted Risk (short-term)
## • Launch Probability

## ▪ Cluster Outputs
- Cluster polygon
- Cluster intensity
- Cluster type (swarm / hotspot / corridor)

## ▪ Prediction Outputs
- Future hotspot zones
- Predicted movement corridors

## ▪ Launch Zone Outputs
- probable origin area
- confidence level

▪ 10. UI Fields
Displayed in map and zone panel:
- Heatmap intensity
- Zone threat score
- Zone label (e.g., “High Activity Zone”)
- Swarm indicator
- Historical recurrence indicator

Driif.ai [Type here] [Type here]
## 44
- Predicted movement overlay
- Launch zone marker

17.7. Map Visualization Requirements - UX
System must display:
- real-time heatmap
- cluster polygons
- predicted future zones (dashed overlay)
- historical heatmap toggle
- suspected launch zones
- protected asset zones

## 17.8. Alert Conditions
Trigger alerts when:
- area threat score exceeds threshold
- new hotspot emerges
- swarm cluster forms
- historical pattern repeats
- predicted path intersects protected asset

## 17.9. Performance Requirements
- Heatmap refresh rate: ≤ 2 seconds
- Threat score computation latency: ≤ 2 seconds
- Prediction refresh: ≤ 3 seconds
- Historical lookup latency: ≤ 1 second


Driif.ai [Type here] [Type here]
## 45
## 17.10. Explainability Requirements
System must display reason codes:
## Example:
Area flagged as high risk due to:
- high drone density
- repeated visits in last 7 days
- perimeter inspection pattern
- proximity to protected asset

## 17.11. Logging & Storage
System must store:
- grid-level features
- threat scores over time
- cluster evolution
- prediction outputs
- operator actions
Used for:
- model retraining
- forensic analysis

## 17.12. Dependencies
- Sensor fusion pipeline
- Geospatial database
- Historical event storage
- Real-time streaming infrastructure
- ML inference service


Driif.ai [Type here] [Type here]
## 46
## 17.13. Future Enhancements
- Cross-base intelligence sharing
- Long-term pattern forecasting
- Adversary behavior modeling
- Integration with autonomous engagement engine
## 18. Statistics

18.1. Performance Requirements from swram
## Metric Requirement
Detection latency < 2 seconds
Maximum tracked drones 100+
Swarm detection accuracy > 90%
False positive rate < 5%
18.2. Daily activity



