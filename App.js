import React from 'react';
import { StyleSheet, Text, View, Button, Platform } from 'react-native';

// BEGIN AWS AppSync 
import appsyncConfig from './config/AppSync';
import { ApolloProvider } from 'react-apollo';
import AWSAppSyncClient from 'aws-appsync';
import { Rehydrated } from 'aws-appsync-react';

const appsyncClient = new AWSAppSyncClient({
  url: appsyncConfig.graphqlEndpoint,
  region: appsyncConfig.region,
  auth: { type: appsyncConfig.authenticationType, apiKey: appsyncConfig.apiKey }
});
// END AWS AppSync 

import { graphql, compose } from 'react-apollo';
//import * as AWS from 'aws-sdk';

import { StackNavigator } from 'react-navigation';

import AllEvents from './Components/AllEvents'
import AddEvent from "./Components/AddEvent";
import ListEvents from './queries/ListEvents';
import CreateEvent from './queries/CreateEvent';
import DeleteEvent from './queries/DeleteEvent';

console.disableYellowBox = true;


_button = function(navigation){
  if(Platform.OS === 'ios'){
    return <Button title='Create' color='#ffffff' onPress={()=> navigation.navigate('AddEvent')} />
  }else {
    return <Button title='Create' onPress={()=> navigation.navigate('AddEvent')} />
  }
}

const App = StackNavigator({
  AllEvents : { 
    screen : (props) => <AllEventWithData {...props}/>,
    navigationOptions: ({navigation}) => ({
      title: 'Upcoming Events',
      headerRight: this._button(navigation),
      headerStyle:{
        backgroundColor:'#42a1f4',
      },
      headerTitleStyle:{
        color: '#ffffff'
      },
      headerTintColor:'#ffffff'
    })
  },
  AddEvent: {
    screen: (props) => <AddEventData {...props} />,
     navigationOptions: ({navigation, screenProps}) => {
      return {
        title: 'Create Event',
        headerStyle:{
          backgroundColor:'#42a1f4'
        },
        headerTitleStyle:{
          color: '#ffffff'
        },
        headerTintColor:'#ffffff'
      };
    }
  }
});

const WithProvider = () => (
<ApolloProvider client={appsyncClient}>
    <Rehydrated>
        <App />
    </Rehydrated>
</ApolloProvider>
);

export default WithProvider;

const AllEventWithData = compose(
  graphql(ListEvents, {
      options: {
        fetchPolicy: 'cache-and-network'
      },
      props: (props) => ({
        events: props.data.listEvents ? props.data.listEvents.items : [],
      })
  }),
  graphql(DeleteEvent, {
    options:{
      fetchPolicy: 'cache-and-network'
    },
    props: (props) => ({
        onDelete: (event) => {
          props.mutate({
            variables: { id: event.id },
            optimisticResponse: () => ({ deleteEvent: { ...event, __typename: 'Event', comments: {__typename:"CommentConnection",items:[], nextToken:null} } }),
          })
        }
    }),
    options: {
      refetchQueries: [{ query: ListEvents }],
      update: (dataProxy, { data: { deleteEvent: { id } } }) => {
        const query = ListEvents;
        const data = dataProxy.readQuery({ query });
        data.listEvents.items = data.listEvents.items.filter(event => event.id !== id);
        dataProxy.writeQuery({ query, data });
      }
    }
  }),
)(AllEvents);

const AddEventData = compose(
  graphql(CreateEvent, {
    options:{
      fetchPolicy: 'cache-and-network'
    },
    props: (props) => ({
        onAdd: event => {
          props.mutate({
            variables: event,
            optimisticResponse: () => ({ createEvent: { ...event, __typename: 'Event', comments: {__typename:"CommentConnection",items:[], nextToken:null} }}),
          });
       }
    }),
    options: {
      refetchQueries: [{ query: ListEvents }],
      update: (dataProxy, { data: { createEvent } }) => {
        const query = ListEvents;
        const data = dataProxy.readQuery({ query });
        data.listEvents.items.push(createEvent);
        dataProxy.writeQuery({ query, data });
      }
    }
  })
)(AddEvent);

const styles = StyleSheet.create({
  container: {
      flex: 1,
      flexDirection: 'column',
      backgroundColor: '#fff',
      alignItems: 'stretch',
      justifyContent: 'center',
  },
});
