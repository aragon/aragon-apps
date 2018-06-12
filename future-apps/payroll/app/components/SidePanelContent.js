import React from "react";
import styled from "styled-components";
import { Text, Button, Info, TextInput } from "@aragon/ui";
import LinkedSliders from "./LinkedSliders";

class SidePanelContent extends React.Component {
  render() {
    return (
      <Container>
        <Info.Action title="Choose which tokens you get paid in">
          You can add as many tokens as you like, as long as your DAO has these tokens.
        </Info.Action>

        <LinkedSliders />

        <Info.Permissions title="Submission note">
          Your split contract will be updated on the blockchain, and you cannot request salary until it’s complete{" "}
        </Info.Permissions>

        <Button mode="strong">Submit split configuration</Button>
      </Container>
    );
  }
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 100px 380px 100px 50px;
  grid-gap: 30px;
`;

export default SidePanelContent;
