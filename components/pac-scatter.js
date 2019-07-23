const React = require('react');
const D3Component = require('idyll-d3-component');
const d3 = require('d3');

const size = 600;

class PacScatter extends D3Component {

  updateTime(speed) {
    if (speed === 'PAUSE') {
      return 10;
    } else if (speed === 'FASTER') {
      return 250;
    } else if (speed === 'FINISH') {
      return 10;
    } else {
      return 1500;
    }
  }

  initializeData() {
    // n_samples = {this.n_samples}
    // speed = {this.speed}
    // showGroundTruth = {this.showGroundTruth}
    // resetData = {this.resetData}

    this.xValue = (d) => { return d.x;}; // data -> value
    this.xScale = d3.scaleLinear().range([0, this.width]); // value -> display
    this.xMap = (d) => { return this.xScale(this.xValue(d));}; // data -> display
    this.xAxis = d3.axisBottom(this.xScale).ticks(0);
    // setup y
    this.yValue = (d) => { return d.y;}; // data -> value
    this.yScale = d3.scaleLinear().range([this.height, 0]); // value -> display
    this.yMap = (d) => { return this.yScale(this.yValue(d));}; // data -> display
    this.yAxis = d3.axisLeft(this.yScale).ticks(0);

    // setup fill color
    this.cValue = (d) => { return d.label ? 'green' : 'red';};

    // Generating the random data
    // First, generate the bounds.
    this.outerBounds = { x: { min: 0.0, max: 1.0 }, y: { min: 0.0, max: 1.0 } };
    // this.targetTrainDistributionType = 'rectangle';
    this.targetTrainDistribution = this.generateRandomRect(this.outerBounds);
    // targetTrainDistributionType="ellipse"
    // targetTestDistributionType="ellipse"
    // trainMatchTest={true}
    if (this.props.trainMatchTest) {
      this.targetTestDistribution = this.targetTrainDistribution;
    } else {
      this.targetTestDistribution = this.generateRandomRect(this.outerBounds);
    }

    if (this.props.targetTrainDistributionType === 'ellipse') {
      this.generatedTrainData = this.generateUniformEllipseData(this.targetTrainDistribution, this.outerBounds, this.props.total_samples)
    } else {
      this.generatedTrainData = this.generateUniformRectData(this.targetTrainDistribution, this.outerBounds, this.props.total_samples)  
    }

    if (this.props.targetTestDistributionType === 'ellipse') {
      this.generatedTestData = this.generateUniformEllipseData(this.targetTestDistribution, this.outerBounds, this.props.total_samples)
    } else {
      this.generatedTestData = this.generateUniformRectData(this.targetTestDistribution, this.outerBounds, this.props.total_samples)  
    }

    this.setState({data: this.generatedTrainData});
    this.xScale.domain([this.outerBounds.x.min, this.outerBounds.x.max]);
    this.yScale.domain([this.outerBounds.y.min, this.outerBounds.y.max]);
    this.svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + this.height + ")")
      .call(this.xAxis);
    this.svg.append("g")
      .attr("class", "y axis")
      .call(this.yAxis)

          // this.drawAllPoints();
    this.setState((state, props) => { return { dataQueue: this.generatedTrainData.slice()}},
                  () => {
                    if (this.props.speed !== 'PAUSE') {
                      this.animatePoints();
                    }
                    this.drawTargetDistribution(this.props.showGroundTruth);
                  }    
    );

  }

  constructor(props) {
    super(props)
    this.state = {
      data: [],
      dataQueue: [],
      lastSpeed: 'PAUSE'
    }
    this.groundTruthBox = React.createRef();
    this.svg = React.createRef();

    // JAVASCRIPT IS AWFUL
    // IS THERE SOMETHING BIGGER THAN CAPS?
    this.animatePoints = this.animatePoints.bind(this);
  }

  initialize(node, props) {
    // Some code based on http://bl.ocks.org/weiglemc/6185069
    this.margin = {top: 20, right: 20, bottom: 30, left: 40};
    this.width = 960 - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;
        
    this.svg = d3.select(node).append('svg');
    this.svg.attr('viewBox', `0 0 ${size} ${size}`)
      .style('width', this.width + this.margin.left + this.margin.right)
      .style('height', this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.state = {
      data: [],
      dataQueue: [],
      lastSpeed: 'PAUSE',
      timerStarted: false
    }
    this.initializeData();
  }

  update(props, oldProps) {
    this.drawTargetDistribution(props.showGroundTruth);

    if (!oldProps.testing && props.testing) {
      // We've switched from training to testing
      this.setState((state, props) => { return { dataQueue: this.generatedTestData.slice()}},
        () => {
          // First, remove all circles
          this.eraseAllPoints();

          this.animatePoints('FINISH');
          this.drawTargetDistribution(this.props.showGroundTruth);
        }
      )    
    }

    if ((oldProps.speed === 'PAUSE' || this.state.timerStarted == false) && props.speed !== 'PAUSE') {
      this.state.lastSpeed = props.speed;
      this.animatePoints(props.speed);
    }
  }

  componentDidUpdate(props, state) {
    // Check to see if moved from pause to other thing
    if ((state.lastSpeed === 'PAUSE' || state.timerStarted == false) && props.speed !== 'PAUSE') {
      this.state.lastSpeed = props.speed;
      this.animatePoints();
    }
  }

  animatePoints(speed='NORMAL') {
    if (this.state.dataQueue.length > 0) {
      setTimeout(
        () => {
          if (speed === 'PAUSE') {
            this.state.timerStarted = false;
          } else {
            this.state.timerStarted = true;
            this.drawNextPoint();
            if (speed === 'FINISH') {
              this.animatePoints('FINISH');
            } else {
              this.animatePoints(this.props.speed);
            }
          }
        },
        this.updateTime(speed)
      )
  
    }
  }

  eraseAllPoints() {
    this.svg.selectAll('circle')
      .attr("r", 3.5)
      .transition()
      .duration(500)
      .attr("r", 0.5)
      .remove();
  }

  drawNextPoint() {
    const datum = this.state.dataQueue.pop();
    this.svg.append("circle")
      .attr("class", "dot")
      .attr("cx", this.xMap(datum))
      .attr("cy", this.yMap(datum))
      .style("fill", this.cValue(datum)) 
      .attr("r", 0.5)
      .transition()
      .duration(1000)
      .attr("r", 5.5)
      .transition()
      .duration(1000)
      .attr("r", 3.5);
  }

  drawAllPoints() {
    this.svg.selectAll(".dot")
      .data(this.state.data)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("r", 3.5)
      .attr("cx", this.xMap)
      .attr("cy", this.yMap)
      .style("fill", (d) => { return this.cValue(d);}) 
  }

  drawTargetDistribution(forceDraw=false) {
    switch (this.props.targetTrainDistributionType) {
      case 'rectangle':
        this.drawTargetDistributionRectangle(forceDraw);
        return;
      case 'ellipse':
        this.drawTargetDistributionEllipse(forceDraw);
        return;
      default:
        console.log("tried to draw target distribution for ", this.props.targetTrainDistributionType);
    }
  }

  drawTargetDistributionRectangle(forceDraw=false) {
    this.svg.selectAll(".target-distribution").remove();
    if (forceDraw) {
      this.svg.append("rect")
        .attr("class", "rect target-distribution")
        .attr("x", this.xScale(this.targetTrainDistribution.x.min))
        .attr("y", this.yScale(this.targetTrainDistribution.y.max))
        .attr("width", this.xScale(this.targetTrainDistribution.x.max) - this.xScale(this.targetTrainDistribution.x.min))
        .attr("height", this.yScale(this.targetTrainDistribution.y.min) - this.yScale(this.targetTrainDistribution.y.max))
    }
  }

  drawTargetDistributionEllipse(forceDraw=false) {
    this.svg.selectAll(".target-distribution").remove();
    if (forceDraw) {
      this.svg.append("ellipse")
        .attr("class", "ellipse target-distribution")
        .attr("cx", this.xScale((this.targetTrainDistribution.x.min + this.targetTrainDistribution.x.max) / 2.0))
        .attr("cy", this.yScale((this.targetTrainDistribution.y.min + this.targetTrainDistribution.y.max) / 2.0))
        .attr("rx", (this.xScale(this.targetTrainDistribution.x.max) - this.xScale(this.targetTrainDistribution.x.min)) / 2.0)
        .attr("ry", (this.yScale(this.targetTrainDistribution.y.min) - this.yScale(this.targetTrainDistribution.y.max)) / 2.0)
    }
  }

  // Generating random data
  generateUniformRectData(rectBounds, outerBounds, n=10) {
    let rectData = [];
    for (let i=0; i<n; i++) {
      rectData.push(this.generateUniformRandomPt(rectBounds, outerBounds));
    }
    return rectData;
  }

  generateUniformEllipseData(ellipseBounds, outerBounds, n=10) {
    let ellipseData = [];
    for (let i=0; i<n; i++) {
      ellipseData.push(this.generateUniformRandomPt(ellipseBounds, outerBounds, 'ellipse'));
    }
    return ellipseData;
  }

  generateUniformRandomPt(shapeBounds, outerBounds, region='rectangle') {
    const outerXMin = outerBounds.x.min,
    outerXMax = outerBounds.x.max,
    outerYMin = outerBounds.y.min,
    outerYMax = outerBounds.y.max;

    const xVal = this.getRandomArbitrary(outerXMin, outerXMax);
    const yVal = this.getRandomArbitrary(outerYMin, outerYMax);

    const rectXMin = shapeBounds.x.min, 
    rectXMax = shapeBounds.x.max, 
    rectYMin = shapeBounds.y.min, 
    rectYMax = shapeBounds.y.max;

    let label = false;
    if (region === 'ellipse') {
      const ellipseCX = (rectXMin + rectXMax) / 2.0,
      ellipseCY = (rectYMin + rectYMax) / 2.0,
      ellipseRX = (rectXMax - rectXMin) / 2.0, 
      ellipseRY = (rectYMax - rectYMin) / 2.0;
      // ((x-h)^2)/(r_x)^2 + ((y-k)^2)/(r_y)^2 <= 1
      label = (((xVal - ellipseCX)*(xVal - ellipseCX))/(ellipseRX*ellipseRX)
            + ((yVal - ellipseCY)*(yVal - ellipseCY))/(ellipseRY*ellipseRY))
            < 1.0;
    } else { // rectangle
      label = (rectXMin < xVal) && (xVal < rectXMax) &&
              (rectYMin < yVal) && (yVal < rectYMax);
    }

    return {x: xVal, y: yVal, label: label};
  }

  generateRandomRect(outerBounds, minwidth=0.2, margin=0.05) {
    const outerXMin = outerBounds.x.min, 
    outerXMax = outerBounds.x.max, 
    outerYMin = outerBounds.y.min, 
    outerYMax = outerBounds.y.max,
    outerXDiff = outerXMax - outerXMin,
    outerYDiff = outerYMax - outerYMin;

    return {
      x: this.getRandomBounds(outerXMin, outerXMax, minwidth * outerXDiff, margin * outerXDiff),
      y: this.getRandomBounds(outerYMin, outerYMax, minwidth * outerYDiff, margin * outerYDiff)
    }
  }

  getRandomBounds(min=0.0, max=1.0, minwidth=0.2, margin=0.05) {
    const boundMin = this.getRandomArbitrary(min + margin, (min + max) / 2.0);
    const boundMax = this.getRandomArbitrary(Math.max(min + minwidth, (min + max) / 2.0), max - margin);
    return {min: boundMin, max: boundMax};
  }

  getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
  }
}

module.exports = PacScatter;
