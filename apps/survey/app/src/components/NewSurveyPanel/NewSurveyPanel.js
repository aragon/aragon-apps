import React from "react";
import styled from "styled-components";
import { SidePanel, Info, Field, TextInput, Button } from "@aragon/ui";

const initialState = {
  question: "",
  description: "",
  url: ""
};

class NewSurveyPanel extends React.Component {
  static defaultProps = {
    onCreateSurvey: () => {}
  };
  state = {
    ...initialState
  };
  componentWillReceiveProps({ opened }) {
    if (opened && !this.props.opened) {
      // setTimeout is needed as a small hack to wait until
      // the input's on screen until we call focus.
      this._questionInput && setTimeout(() => this._questionInput.focus(), 0);
    } else if (!opened && this.props.opened) {
      // Finished closing the panel, so reset its state
      this.setState({ ...initialState });
    }
  }
  handleQuestionChange = ({ target: { value } }) => {
    this.setState({ question: value });
  };
  handleDescriptionChange = ({ target: { value } }) => {
    this.setState({ description: value });
  };
  handleUrlChange = ({ target: { value } }) => {
    this.setState({ url: value });
  };
  handleSubmit = event => {
    event.preventDefault();
    this.props.onCreateSurvey(this.state.question.trim());
  };
  render() {
    const { question, description, url } = this.state;
    const { opened, onClose } = this.props;
    return (
      <SidePanel title="New Survey" opened={opened} onClose={onClose}>
        <Info.Action title="Surveys are informative">
          Surveys are used for signaling and don’t have any direct repercussions
          on the organization.
        </Info.Action>
        <Form onSubmit={this.handleSubmit}>
          <Field label="Question">
            <TextInput
              innerRef={question => (this._questionInput = question)}
              value={question}
              onChange={this.handleQuestionChange}
              placeholder="Enter survey question"
              required
              wide
            />
          </Field>
          <Field label="Description (optional)">
            <TextInput.Multiline
              value={description}
              onChange={this.handleDescriptionChange}
              placeholder="Enter description of the survey"
              wide
            />
          </Field>
          <Field label="Web Link (optional)">
            <TextInput
              type="url"
              value={url}
              onChange={this.handleUrlChange}
              placeholder="https://example.org/my-proposal.html"
              wide
            />
          </Field>
          <Button mode="strong" type="submit" wide>
            Create Survey
          </Button>
        </Form>
      </SidePanel>
    );
  }
}

const Form = styled.form`
  margin-top: 20px;
`;

export default NewSurveyPanel;
